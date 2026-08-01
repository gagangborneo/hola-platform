import { USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { err } from '../../lib/errors.ts'
import { buildOffsetResponseMeta } from '../../lib/pagination.ts'
import { ok, okList } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import { idempotency } from '../../middleware/idempotency.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  approveRefundSchema,
  createRefundSchema,
  markRefundCompletedSchema,
  refundIdParam,
  refundsQuerySchema,
  rejectRefundSchema,
} from './refunds.schema.ts'
import { serializeRefund } from './refunds.serializer.ts'
import {
  approveRefund,
  createRefundRequest,
  getRefund,
  getRefunds,
  markRefundCompleted,
  rejectRefund,
} from './refunds.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const PREFIX = '/api/v1/refunds'
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
  )
    throw err.unauthenticated()
  const actor: Viewer = { userId, role, cafeTenantId: undefined, employeeId: undefined }
  const requestId = c.get('requestId')
  return {
    ...core,
    now,
    actor,
    requestId: typeof requestId === 'string' ? requestId : undefined,
    ipAddress: c.req.header('cf-connecting-ip') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  }
}

registerGuardedRoute('GET', PREFIX)
registerGuardedRoute('POST', PREFIX)
registerGuardedRoute('GET', `${PREFIX}/:id`)
registerGuardedRoute('POST', `${PREFIX}/:id/approve`)
registerGuardedRoute('POST', `${PREFIX}/:id/reject`)
registerGuardedRoute('POST', `${PREFIX}/:id/mark-completed`)

export const refundsRoutes = new Hono<{ Variables: Variables }>()
  .get(
    '/refunds',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('query', refundsQuerySchema, validationHook),
    async (c) => {
      const query = c.req.valid('query')
      const result = await getRefunds(context(c), query)
      const role = c.get('role') ?? USER_ROLE.CUSTOMER
      return c.json(
        okList(
          result.rows.map((row) => serializeRefund(row, role)),
          buildOffsetResponseMeta(query, result.totalCount),
        ),
      )
    },
  )
  .post(
    '/refunds',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    idempotency('refund.create'),
    zValidator('json', createRefundSchema, validationHook),
    async (c) => {
      const row = await createRefundRequest(context(c), c.req.valid('json'))
      return c.json(ok(serializeRefund(row, c.get('role') ?? USER_ROLE.STAFF)), 201)
    },
  )
  .get(
    '/refunds/:id',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', refundIdParam, validationHook),
    async (c) => {
      const row = await getRefund(context(c), c.req.valid('param').id)
      return c.json(ok(serializeRefund(row, c.get('role') ?? USER_ROLE.CUSTOMER)))
    },
  )
  .post(
    '/refunds/:id/approve',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', refundIdParam, validationHook),
    zValidator('json', approveRefundSchema, validationHook),
    async (c) => {
      const row = await approveRefund(context(c), c.req.valid('param').id, c.req.valid('json'))
      return c.json(ok(serializeRefund(row, USER_ROLE.ADMIN)))
    },
  )
  .post(
    '/refunds/:id/reject',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', refundIdParam, validationHook),
    zValidator('json', rejectRefundSchema, validationHook),
    async (c) => {
      const row = await rejectRefund(
        context(c),
        c.req.valid('param').id,
        c.req.valid('json').reason,
      )
      return c.json(ok(serializeRefund(row, USER_ROLE.ADMIN)))
    },
  )
  .post(
    '/refunds/:id/mark-completed',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', refundIdParam, validationHook),
    zValidator('json', markRefundCompletedSchema, validationHook),
    async (c) => {
      const row = await markRefundCompleted(
        context(c),
        c.req.valid('param').id,
        c.req.valid('json'),
      )
      return c.json(ok(serializeRefund(row, c.get('role') ?? USER_ROLE.STAFF)))
    },
  )
