import { RATE_LIMIT_BUCKET, USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { err } from '../../lib/errors.ts'
import { buildOffsetResponseMeta } from '../../lib/pagination.ts'
import { ok, okList } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import { rateLimit } from '../../middleware/rate-limit.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  createPromoSchema,
  patchPromoSchema,
  promoIdParam,
  promosQuerySchema,
  redemptionsQuerySchema,
  validatePromoSchema,
} from './promos.schema.ts'
import {
  serializePromo,
  serializePromoDetail,
  serializePromoRedemption,
} from './promos.serializer.ts'
import {
  changeAdminPromoStatus,
  createAdminPromo,
  getAvailablePromos,
  getPromo,
  getPromoRedemptions,
  listAdminPromos,
  patchAdminPromo,
  validatePromo,
} from './promos.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const PREFIX = '/api/v1/promos'

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
  const requestId = c.get('requestId')
  if (
    !(now instanceof Date) ||
    typeof userId !== 'string' ||
    (role !== USER_ROLE.CUSTOMER && role !== USER_ROLE.STAFF && role !== USER_ROLE.ADMIN)
  ) {
    throw err.unauthenticated()
  }
  const actor: Viewer = { userId, role, cafeTenantId: undefined, employeeId: undefined }
  return {
    ...core,
    now,
    actor,
    requestId: typeof requestId === 'string' ? requestId : undefined,
    ipAddress: undefined,
    userAgent: c.req.header('user-agent'),
  }
}

function ifMatch(value: string | undefined): number | undefined {
  if (value === undefined) return undefined
  const version = Number(value)
  if (!Number.isInteger(version) || version < 1) throw err.validation({ field: 'If-Match' })
  return version
}

registerGuardedRoute('POST', `${PREFIX}/validate`)
registerGuardedRoute('GET', `${PREFIX}/available`)
registerGuardedRoute('GET', PREFIX)
registerGuardedRoute('POST', PREFIX)
registerGuardedRoute('GET', `${PREFIX}/:id`)
registerGuardedRoute('PATCH', `${PREFIX}/:id`)
registerGuardedRoute('POST', `${PREFIX}/:id/pause`)
registerGuardedRoute('POST', `${PREFIX}/:id/activate`)
registerGuardedRoute('POST', `${PREFIX}/:id/archive`)
registerGuardedRoute('GET', `${PREFIX}/:id/redemptions`)

export const promosRoutes = new Hono<{ Variables: Variables }>()
  .use('/promos/validate', rateLimit(RATE_LIMIT_BUCKET.PROMO_VALIDATE))
  .post(
    '/promos/validate',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('json', validatePromoSchema, validationHook),
    async (c) => {
      const result = await validatePromo(context(c), c.req.valid('json'))
      return c.json(
        ok({
          is_valid: result.isValid,
          discount_amount: result.discountAmount,
          promo: result.promo,
        }),
      )
    },
  )
  .get(
    '/promos/available',
    authenticate,
    requireRole([USER_ROLE.CUSTOMER, USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    async (c) => {
      const rows = await getAvailablePromos(context(c))
      return c.json(ok(rows.map(serializePromo)))
    },
  )
  .get(
    '/promos',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('query', promosQuerySchema, validationHook),
    async (c) => {
      const ctx = context(c)
      const query = c.req.valid('query')
      const result = await listAdminPromos(ctx, query)
      return c.json(
        okList(result.rows.map(serializePromo), buildOffsetResponseMeta(query, result.totalCount)),
      )
    },
  )
  .post(
    '/promos',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('json', createPromoSchema, validationHook),
    async (c) => {
      const row = await createAdminPromo(context(c), c.req.valid('json'))
      return c.json(ok(serializePromo(row)), 201)
    },
  )
  .get(
    '/promos/:id',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', promoIdParam, validationHook),
    async (c) => {
      const ctx = context(c)
      const detail = await getPromo(ctx, c.req.valid('param').id)
      return c.json(
        ok(serializePromoDetail(detail.promo, detail.stats, ctx.actor.role === USER_ROLE.ADMIN)),
      )
    },
  )
  .patch(
    '/promos/:id',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', promoIdParam, validationHook),
    zValidator('json', patchPromoSchema, validationHook),
    async (c) => {
      const row = await patchAdminPromo(context(c), {
        id: c.req.valid('param').id,
        patch: c.req.valid('json'),
        version: ifMatch(c.req.header('if-match')),
      })
      return c.json(ok(serializePromo(row)))
    },
  )
  .post(
    '/promos/:id/pause',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', promoIdParam, validationHook),
    async (c) => {
      const row = await changeAdminPromoStatus(context(c), c.req.valid('param').id, 'paused')
      return c.json(ok(serializePromo(row)))
    },
  )
  .post(
    '/promos/:id/activate',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', promoIdParam, validationHook),
    async (c) => {
      const row = await changeAdminPromoStatus(context(c), c.req.valid('param').id, 'active')
      return c.json(ok(serializePromo(row)))
    },
  )
  .post(
    '/promos/:id/archive',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', promoIdParam, validationHook),
    async (c) => {
      const row = await changeAdminPromoStatus(context(c), c.req.valid('param').id, 'archived')
      return c.json(ok(serializePromo(row)))
    },
  )
  .get(
    '/promos/:id/redemptions',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', promoIdParam, validationHook),
    zValidator('query', redemptionsQuerySchema, validationHook),
    async (c) => {
      const query = c.req.valid('query')
      const result = await getPromoRedemptions(context(c), c.req.valid('param').id, query)
      return c.json(
        okList(
          result.rows.map(serializePromoRedemption),
          buildOffsetResponseMeta(query, result.totalCount),
        ),
      )
    },
  )
