/** Endpoint profil milik pengguna yang sedang login. Kontrak: docs/04 § 9.12. */
import { USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { err } from '../../lib/errors.ts'
import { ok } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { notificationPrefsSchema, updateMyProfileSchema } from './profile.schema.ts'
import { serializeMyProfile } from './profile.serializer.ts'
import { getMyProfile, updateMyNotificationPrefs, updateMyProfile } from './profile.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables

const AUTHENTICATED_ROLES = Object.values(USER_ROLE)
const PREFIX = '/api/v1/me'

function validationHook(result: { success: boolean; error?: unknown }) {
  if (!result.success) throw result.error
}

function viewer(c: { get: (key: 'userId' | 'role' | 'cafeTenantId' | 'employeeId') => unknown }) {
  const userId = c.get('userId')
  const role = c.get('role')
  if (
    typeof userId !== 'string' ||
    !AUTHENTICATED_ROLES.includes(role as (typeof AUTHENTICATED_ROLES)[number])
  )
    throw err.unauthenticated()
  return {
    userId,
    role: role as (typeof AUTHENTICATED_ROLES)[number],
    cafeTenantId:
      typeof c.get('cafeTenantId') === 'string' ? (c.get('cafeTenantId') as string) : undefined,
    employeeId:
      typeof c.get('employeeId') === 'string' ? (c.get('employeeId') as string) : undefined,
  } satisfies Viewer
}

function requestContext(c: {
  req: { header: (name: string) => string | undefined }
  get: (key: 'requestId') => unknown
}) {
  return {
    ipAddress:
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
    requestId: typeof c.get('requestId') === 'string' ? (c.get('requestId') as string) : undefined,
  }
}

registerGuardedRoute('GET', `${PREFIX}/profile`)
registerGuardedRoute('PATCH', `${PREFIX}/profile`)
registerGuardedRoute('PUT', `${PREFIX}/notification-prefs`)

export const profileRoutes = new Hono<{ Variables: Variables }>()
  .get('/me/profile', authenticate, requireRole(AUTHENTICATED_ROLES), async (c) => {
    const row = await getMyProfile(c.get('core'), viewer(c))
    return c.json(ok(serializeMyProfile(row)))
  })
  .patch(
    '/me/profile',
    authenticate,
    requireRole(AUTHENTICATED_ROLES),
    zValidator('json', updateMyProfileSchema, validationHook),
    async (c) => {
      const row = await updateMyProfile(
        { ...c.get('core'), now: c.get('now') },
        viewer(c),
        c.req.valid('json'),
        requestContext(c),
      )
      return c.json(ok(serializeMyProfile(row)))
    },
  )
  .put(
    '/me/notification-prefs',
    authenticate,
    requireRole(AUTHENTICATED_ROLES),
    zValidator('json', notificationPrefsSchema, validationHook),
    async (c) => {
      const prefs = await updateMyNotificationPrefs(
        { ...c.get('core'), now: c.get('now') },
        viewer(c),
        c.req.valid('json'),
      )
      return c.json(ok(prefs))
    },
  )
