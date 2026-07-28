/** Endpoint inbox in-app milik pengguna yang sedang login. */
import { USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { err } from '../../lib/errors.ts'
import { okList } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import { notificationIdParam, notificationsQuerySchema } from './notification.schema.ts'
import { serializeInboxNotification } from './notification.serializer.ts'
import {
  listMyNotifications,
  readAllMyNotifications,
  readMyNotification,
} from './notification.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const AUTHENTICATED_ROLES = Object.values(USER_ROLE)
const PREFIX = '/api/v1/me/notifications'

function validationHook(result: { success: boolean; error?: unknown }) {
  if (!result.success) throw result.error
}

function userId(c: { get: (key: 'userId') => unknown }): string {
  const id = c.get('userId')
  if (typeof id !== 'string') throw err.unauthenticated()
  return id
}

registerGuardedRoute('GET', PREFIX)
registerGuardedRoute('POST', `${PREFIX}/:id/read`)
registerGuardedRoute('POST', `${PREFIX}/read-all`)

export const notificationRoutes = new Hono<{ Variables: Variables }>()
  .get(
    '/me/notifications',
    authenticate,
    requireRole(AUTHENTICATED_ROLES),
    zValidator('query', notificationsQuerySchema, validationHook),
    async (c) => {
      const result = await listMyNotifications(c.get('core'), userId(c), c.req.valid('query'))
      return c.json(
        okList(result.rows.map(serializeInboxNotification), { pagination: result.pagination }),
      )
    },
  )
  .post(
    '/me/notifications/:id/read',
    authenticate,
    requireRole(AUTHENTICATED_ROLES),
    zValidator('param', notificationIdParam, validationHook),
    async (c) => {
      await readMyNotification(
        { db: c.get('core').db, now: c.get('now') },
        userId(c),
        c.req.valid('param').id,
      )
      return c.body(null, 204)
    },
  )
  .post('/me/notifications/read-all', authenticate, requireRole(AUTHENTICATED_ROLES), async (c) => {
    await readAllMyNotifications({ db: c.get('core').db, now: c.get('now') }, userId(c))
    return c.body(null, 204)
  })
