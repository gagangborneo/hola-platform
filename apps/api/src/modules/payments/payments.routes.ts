import { RATE_LIMIT_BUCKET, USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { env } from '../../env.ts'
import { err } from '../../lib/errors.ts'
import { buildOffsetResponseMeta } from '../../lib/pagination.ts'
import { ok, okList } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import { idempotency } from '../../middleware/idempotency.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import { rateLimit } from '../../middleware/rate-limit.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  createManualPaymentSchema,
  createPaymentSchema,
  paymentIdParam,
  paymentsQuerySchema,
  simulateWebhookSchema,
} from './payments.schema.ts'
import { serializePayment } from './payments.serializer.ts'
import {
  cancelPayment,
  createManualPayment,
  createPayment,
  getPayment,
  getPayments,
  receiveMidtransWebhook,
  simulateMidtransWebhook,
  syncPayment,
} from './payments.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const PREFIX = '/api/v1/payments'

function validationHook(result: { success: boolean; error?: unknown }): void {
  if (!result.success) throw result.error
}

function context(c: {
  get: (key: 'core' | 'now' | 'requestId' | 'userId' | 'role') => unknown
  req: { header: (name: string) => string | undefined }
}) {
  const core = c.get('core') as Variables['core']
  const now = c.get('now')
  const userId = c.get('userId')
  const role = c.get('role')
  if (
    !(now instanceof Date) ||
    typeof userId !== 'string' ||
    (role !== USER_ROLE.CUSTOMER && role !== USER_ROLE.STAFF && role !== USER_ROLE.ADMIN)
  ) {
    throw err.unauthenticated()
  }
  const actor: Viewer = { userId, role, cafeTenantId: undefined, employeeId: undefined }
  const requestId = c.get('requestId')
  return {
    ...core,
    now,
    actor,
    idempotencyKey: c.req.header('Idempotency-Key'),
    requestId: typeof requestId === 'string' ? requestId : undefined,
    ipAddress:
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  }
}

function webhookContext(c: { get: (key: 'core' | 'now') => unknown }) {
  const core = c.get('core') as Variables['core']
  const now = c.get('now')
  if (!(now instanceof Date)) throw err.internal()
  return { ...core, now }
}

registerGuardedRoute('POST', PREFIX)
registerGuardedRoute('GET', PREFIX)
registerGuardedRoute('GET', `${PREFIX}/:id`)
registerGuardedRoute('POST', `${PREFIX}/:id/cancel`)
registerGuardedRoute('POST', `${PREFIX}/:id/sync`)
registerGuardedRoute('POST', `${PREFIX}/manual`)

const routes = new Hono<{ Variables: Variables }>()
  .post(
    '/payments',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    idempotency('payment.create'),
    zValidator('json', createPaymentSchema, validationHook),
    async (c) => {
      const payment = await createPayment(context(c), c.req.valid('json'))
      return c.json(ok(serializePayment(payment, c.get('role') ?? USER_ROLE.CUSTOMER, true)), 201)
    },
  )
  .post(
    '/payments/manual',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    idempotency('payment.manual'),
    zValidator('json', createManualPaymentSchema, validationHook),
    async (c) => {
      const payment = await createManualPayment(context(c), c.req.valid('json'))
      return c.json(ok(serializePayment(payment, c.get('role') ?? USER_ROLE.STAFF, true)), 201)
    },
  )
  .get(
    '/payments',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('query', paymentsQuerySchema, validationHook),
    async (c) => {
      const query = c.req.valid('query')
      const result = await getPayments(context(c), query)
      const role = c.get('role') ?? USER_ROLE.STAFF
      return c.json(
        okList(
          result.rows.map((payment) => serializePayment(payment, role)),
          buildOffsetResponseMeta(query, result.totalCount),
        ),
      )
    },
  )
  .get(
    '/payments/:id',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', paymentIdParam, validationHook),
    async (c) => {
      const payment = await getPayment(context(c), c.req.valid('param').id)
      return c.json(ok(serializePayment(payment, c.get('role') ?? USER_ROLE.CUSTOMER, true)))
    },
  )
  .post(
    '/payments/:id/cancel',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', paymentIdParam, validationHook),
    async (c) => {
      const payment = await cancelPayment(context(c), c.req.valid('param').id)
      return c.json(ok(serializePayment(payment, c.get('role') ?? USER_ROLE.CUSTOMER)))
    },
  )
  .post(
    '/payments/:id/sync',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', paymentIdParam, validationHook),
    async (c) => {
      const payment = await syncPayment(context(c), c.req.valid('param').id)
      return c.json(ok(serializePayment(payment, c.get('role') ?? USER_ROLE.STAFF, true)))
    },
  )
  .use('/webhooks/midtrans', rateLimit(RATE_LIMIT_BUCKET.WEBHOOK_MIDTRANS))
  .post('/webhooks/midtrans', async (c) => {
    const result = await receiveMidtransWebhook(webhookContext(c), {
      rawBody: await c.req.text(),
      headers: Object.fromEntries(c.req.raw.headers.entries()),
    })
    return c.json(ok({ accepted: true, provider_event_id: result.providerEventId }))
  })

if (env.APP_ENV === 'local') {
  routes.post(
    '/dev/simulate-webhook',
    zValidator('json', simulateWebhookSchema, validationHook),
    async (c) => {
      const result = await simulateMidtransWebhook(webhookContext(c), c.req.valid('json'))
      return c.json(ok({ accepted: true, provider_event_id: result.providerEventId }))
    },
  )
}

export const paymentsRoutes = routes
