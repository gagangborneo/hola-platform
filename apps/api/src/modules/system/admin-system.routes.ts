/** Endpoint sistem yang hanya dapat diakses admin. */
import {
  adminAuditLogsQuerySchema,
  adminSettingKeyParam,
  adminUpdateSettingSchema,
  USER_ROLE,
} from '@hola/shared'
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
import { serializeAdminSetting, serializeAuditLog } from './admin-system.serializer.ts'
import { listAuditLogs, listSettings, updateSetting } from './admin-system.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const ADMIN_PREFIX = '/api/v1/admin'

function validationHook(result: { success: boolean; error?: unknown }): void {
  if (!result.success) throw result.error
}

function requestIp(c: {
  req: { header: (name: string) => string | undefined }
}): string | undefined {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip')
  )
}

function viewer(c: {
  get: (key: 'userId' | 'role' | 'cafeTenantId' | 'employeeId') => unknown
}): Viewer {
  const userId = c.get('userId')
  const role = c.get('role')
  if (typeof userId !== 'string' || role !== USER_ROLE.ADMIN) throw err.unauthenticated()
  return {
    userId,
    role,
    cafeTenantId:
      typeof c.get('cafeTenantId') === 'string' ? (c.get('cafeTenantId') as string) : undefined,
    employeeId:
      typeof c.get('employeeId') === 'string' ? (c.get('employeeId') as string) : undefined,
  }
}

function serviceContext(c: {
  get: (
    key: 'core' | 'now' | 'requestId' | 'userId' | 'role' | 'cafeTenantId' | 'employeeId',
  ) => unknown
  req: { header: (name: string) => string | undefined }
}) {
  const core = c.get('core') as Variables['core']
  const now = c.get('now')
  const requestId = c.get('requestId')
  if (!(now instanceof Date) || typeof requestId !== 'string') throw err.unauthenticated()
  return {
    db: core.db,
    now,
    actor: viewer(c),
    requestId,
    ipAddress: requestIp(c),
    userAgent: c.req.header('user-agent'),
  }
}

registerGuardedRoute('GET', `${ADMIN_PREFIX}/settings`)
registerGuardedRoute('PUT', `${ADMIN_PREFIX}/settings/:key`)
registerGuardedRoute('GET', `${ADMIN_PREFIX}/audit-logs`)

export const adminSystemRoutes = new Hono<{ Variables: Variables }>()
  .get('/admin/settings', authenticate, requireRole([USER_ROLE.ADMIN]), async (c) => {
    const settings = await listSettings(serviceContext(c))
    return c.json(ok(settings.map(serializeAdminSetting)))
  })
  .put(
    '/admin/settings/:key',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', adminSettingKeyParam, validationHook),
    zValidator('json', adminUpdateSettingSchema, validationHook),
    async (c) => {
      const setting = await updateSetting(
        serviceContext(c),
        c.req.valid('param').key,
        c.req.valid('json'),
      )
      return c.json(ok(serializeAdminSetting(setting)))
    },
  )
  .get(
    '/admin/audit-logs',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('query', adminAuditLogsQuerySchema, validationHook),
    async (c) => {
      const query = c.req.valid('query')
      const result = await listAuditLogs(serviceContext(c), query)
      return c.json(
        okList(
          result.logs.map(serializeAuditLog),
          buildOffsetResponseMeta(query, result.totalCount),
        ),
      )
    },
  )
