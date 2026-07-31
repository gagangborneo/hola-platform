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
  courtMaintenanceIdParam,
  courtMaintenancesQuerySchema,
  createCourtMaintenanceSchema,
} from './court-maintenance.schema.ts'
import {
  cancelAdminCourtMaintenance,
  createAdminCourtMaintenance,
  listAdminCourtMaintenances,
} from './court-maintenance.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const PREFIX = '/api/v1/court-maintenances'

function validationHook(result: { success: boolean; error?: unknown }): void {
  if (!result.success) throw result.error
}

function serviceContext(c: {
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
    (role !== USER_ROLE.ADMIN && role !== USER_ROLE.STAFF)
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

function serialize(row: Awaited<ReturnType<typeof createAdminCourtMaintenance>>) {
  return {
    id: row.id,
    court_id: row.courtId,
    starts_at: row.startsAt.toISOString(),
    ends_at: row.endsAt.toISOString(),
    reason: row.reason,
    created_by_user_id: row.createdByUserId,
    cancelled_at: row.cancelledAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

registerGuardedRoute('GET', PREFIX)
registerGuardedRoute('POST', PREFIX)
registerGuardedRoute('POST', `${PREFIX}/:id/cancel`)

export const courtMaintenanceRoutes = new Hono<{ Variables: Variables }>()
  .get(
    '/court-maintenances',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('query', courtMaintenancesQuerySchema, validationHook),
    async (c) => {
      const query = c.req.valid('query')
      const result = await listAdminCourtMaintenances(serviceContext(c), query)
      return c.json(
        okList(result.rows.map(serialize), buildOffsetResponseMeta(query, result.totalCount)),
      )
    },
  )
  .post(
    '/court-maintenances',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('json', createCourtMaintenanceSchema, validationHook),
    async (c) => {
      const maintenance = await createAdminCourtMaintenance(serviceContext(c), c.req.valid('json'))
      return c.json(ok(serialize(maintenance)), 201)
    },
  )
  .post(
    '/court-maintenances/:id/cancel',
    authenticate,
    requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
    zValidator('param', courtMaintenanceIdParam, validationHook),
    async (c) => {
      await cancelAdminCourtMaintenance(serviceContext(c), c.req.valid('param').id)
      return c.body(null, 204)
    },
  )
