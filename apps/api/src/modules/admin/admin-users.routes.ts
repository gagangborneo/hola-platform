/** Admin-only endpoint user management. */
import { idParam, USER_ROLE } from '@hola/shared'
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
  adminCreateUserSchema,
  adminPatchUserSchema,
  adminUsersQuerySchema,
} from './admin-users.schema.ts'
import { serializeAdminUser } from './admin-users.serializer.ts'
import {
  createAdminUser,
  listAdminUsers,
  patchAdminUser,
  revokeAdminUserSessions,
} from './admin-users.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const ADMIN_PREFIX = '/api/v1/admin/users'

function validationHook(result: { success: boolean; error?: unknown }) {
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
    ...core,
    now,
    actor: viewer(c),
    requestId,
    ipAddress: requestIp(c),
    userAgent: c.req.header('user-agent'),
  }
}

registerGuardedRoute('GET', ADMIN_PREFIX)
registerGuardedRoute('POST', ADMIN_PREFIX)
registerGuardedRoute('PATCH', `${ADMIN_PREFIX}/:id`)
registerGuardedRoute('POST', `${ADMIN_PREFIX}/:id/revoke-sessions`)

export const adminUsersRoutes = new Hono<{ Variables: Variables }>()
  .get(
    '/admin/users',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('query', adminUsersQuerySchema, validationHook),
    async (c) => {
      const query = c.req.valid('query')
      const result = await listAdminUsers(serviceContext(c), query)
      return c.json(
        okList(
          result.users.map(serializeAdminUser),
          buildOffsetResponseMeta(query, result.totalCount),
        ),
      )
    },
  )
  .post(
    '/admin/users',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('json', adminCreateUserSchema, validationHook),
    async (c) => {
      const user = await createAdminUser(serviceContext(c), c.req.valid('json'))
      return c.json(ok(serializeAdminUser(user)), 201)
    },
  )
  .patch(
    '/admin/users/:id',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', idParam, validationHook),
    zValidator('json', adminPatchUserSchema, validationHook),
    async (c) => {
      const user = await patchAdminUser(
        serviceContext(c),
        c.req.valid('param').id,
        c.req.valid('json'),
      )
      return c.json(ok(serializeAdminUser(user)))
    },
  )
  .post(
    '/admin/users/:id/revoke-sessions',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', idParam, validationHook),
    async (c) => {
      await revokeAdminUserSessions(serviceContext(c), c.req.valid('param').id)
      return c.body(null, 204)
    },
  )
