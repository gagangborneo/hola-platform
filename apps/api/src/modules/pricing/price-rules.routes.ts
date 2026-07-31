/** Route admin aturan harga; pricing tetap satu-satunya kalkulator harga. */
import { USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { err } from '../../lib/errors.ts'
import { buildOffsetResponseMeta } from '../../lib/pagination.ts'
import { ok, okList } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  createPriceRuleSchema,
  patchPriceRuleSchema,
  priceRuleIdParam,
  priceRulesQuerySchema,
} from './price-rules.schema.ts'
import {
  createAdminPriceRule,
  deleteAdminPriceRule,
  listAdminPriceRules,
  patchAdminPriceRule,
} from './price-rules.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const PREFIX = '/api/v1/price-rules'

function validationHook(result: { success: boolean; error?: unknown }): void {
  if (!result.success) throw result.error
}

function context(c: {
  get: (key: 'core' | 'requestId' | 'userId' | 'role') => unknown
  req: { header: (name: string) => string | undefined }
}) {
  const core = c.get('core') as Variables['core']
  const userId = c.get('userId')
  const role = c.get('role')
  const requestId = c.get('requestId')
  if (typeof userId !== 'string' || (role !== USER_ROLE.ADMIN && role !== USER_ROLE.STAFF)) {
    throw err.unauthenticated()
  }
  const actor: Viewer = { userId, role, cafeTenantId: undefined, employeeId: undefined }
  return {
    ...core,
    actor,
    requestId: typeof requestId === 'string' ? requestId : undefined,
    ipAddress: undefined,
    userAgent: c.req.header('user-agent'),
  }
}

function serialize(rule: Awaited<ReturnType<typeof createAdminPriceRule>>) {
  return {
    id: rule.id,
    court_id: rule.courtId,
    sport_id: rule.sportId,
    day_type: rule.dayType,
    specific_date: rule.specificDate,
    starts_time: rule.startsTime,
    ends_time: rule.endsTime,
    rate_class: rule.rateClass,
    price_per_hour_amount: rule.pricePerHourAmount,
    priority: rule.priority,
    active_from: rule.activeFrom,
    active_to: rule.activeTo,
    is_active: rule.isActive,
    created_at: rule.createdAt.toISOString(),
    updated_at: rule.updatedAt.toISOString(),
  }
}

registerGuardedRoute('GET', PREFIX)
registerGuardedRoute('POST', PREFIX)
registerGuardedRoute('PATCH', `${PREFIX}/:id`)
registerGuardedRoute('DELETE', `${PREFIX}/:id`)

export const priceRulesRoutes = new Hono<{ Variables: Variables }>()
  .get(
    '/price-rules',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('query', priceRulesQuerySchema, validationHook),
    async (c) => {
      const query = c.req.valid('query')
      const result = await listAdminPriceRules(context(c), query)
      return c.json(
        okList(result.rows.map(serialize), buildOffsetResponseMeta(query, result.totalCount)),
      )
    },
  )
  .post(
    '/price-rules',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('json', createPriceRuleSchema, validationHook),
    async (c) => {
      const rule = await createAdminPriceRule(context(c), c.req.valid('json'))
      return c.json(ok(serialize(rule)), 201)
    },
  )
  .patch(
    '/price-rules/:id',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', priceRuleIdParam, validationHook),
    zValidator('json', patchPriceRuleSchema, validationHook),
    async (c) => {
      const rule = await patchAdminPriceRule(
        context(c),
        c.req.valid('param').id,
        c.req.valid('json'),
      )
      return c.json(ok(serialize(rule)))
    },
  )
  .delete(
    '/price-rules/:id',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', priceRuleIdParam, validationHook),
    async (c) => {
      await deleteAdminPriceRule(context(c), c.req.valid('param').id)
      return c.body(null, 204)
    },
  )
