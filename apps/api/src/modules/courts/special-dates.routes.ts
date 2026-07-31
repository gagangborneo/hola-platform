/** Route publik baca dan admin tulis kalender hari khusus. */
import { USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { err } from '../../lib/errors.ts'
import { ok, okList } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { createSpecialDateSchema, specialDateIdParam } from './special-dates.schema.ts'
import {
  createAdminSpecialDate,
  deleteAdminSpecialDate,
  listPublicSpecialDates,
} from './special-dates.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const PREFIX = '/api/v1/special-dates'

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
  if (typeof userId !== 'string' || role !== USER_ROLE.ADMIN) throw err.unauthenticated()
  const actor: Viewer = { userId, role, cafeTenantId: undefined, employeeId: undefined }
  return {
    ...core,
    actor,
    requestId: typeof requestId === 'string' ? requestId : undefined,
    ipAddress: undefined,
    userAgent: c.req.header('user-agent'),
  }
}

function serialize(row: Awaited<ReturnType<typeof createAdminSpecialDate>>) {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    day_type_override: row.dayTypeOverride,
    is_closed: row.isClosed,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

registerGuardedRoute('POST', PREFIX)
registerGuardedRoute('DELETE', `${PREFIX}/:id`)

export const specialDatesRoutes = new Hono<{ Variables: Variables }>()
  .get('/special-dates', async (c) => {
    const rows = await listPublicSpecialDates(c.get('core').db)
    return c.json(okList(rows.map(serialize), {}))
  })
  .post(
    '/special-dates',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('json', createSpecialDateSchema, validationHook),
    async (c) => {
      const row = await createAdminSpecialDate(context(c), c.req.valid('json'))
      return c.json(ok(serialize(row)), 201)
    },
  )
  .delete(
    '/special-dates/:id',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', specialDateIdParam, validationHook),
    async (c) => {
      await deleteAdminSpecialDate(context(c), c.req.valid('param').id)
      return c.body(null, 204)
    },
  )
