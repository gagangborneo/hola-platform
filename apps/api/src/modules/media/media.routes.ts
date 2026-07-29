/** Endpoint presign/confirm/read/delete object media. */
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
import { mediaIdParam, presignMediaSchema } from './media.schema.ts'
import { serializeMedia } from './media.serializer.ts'
import { confirmMediaUpload, deleteMedia, getMedia, presignMediaUpload } from './media.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const AUTHENTICATED_ROLES = Object.values(USER_ROLE)
const PREFIX = '/api/v1/media'

function validationHook(result: { success: boolean; error?: unknown }) {
  if (!result.success) throw result.error
}

function viewer(c: {
  get: (key: 'userId' | 'role' | 'cafeTenantId' | 'employeeId') => unknown
}): Viewer {
  const userId = c.get('userId')
  const role = c.get('role')
  if (
    typeof userId !== 'string' ||
    !AUTHENTICATED_ROLES.includes(role as (typeof AUTHENTICATED_ROLES)[number])
  ) {
    throw err.unauthenticated()
  }
  return {
    userId,
    role: role as (typeof AUTHENTICATED_ROLES)[number],
    cafeTenantId:
      typeof c.get('cafeTenantId') === 'string' ? (c.get('cafeTenantId') as string) : undefined,
    employeeId:
      typeof c.get('employeeId') === 'string' ? (c.get('employeeId') as string) : undefined,
  }
}

function serviceContext(c: { get: (key: 'core' | 'now') => unknown }) {
  const core = c.get('core') as Variables['core']
  const now = c.get('now')
  if (!(now instanceof Date)) throw err.unauthenticated()
  return { ...core, now }
}

registerGuardedRoute('POST', `${PREFIX}/presign`)
registerGuardedRoute('POST', `${PREFIX}/:id/confirm`)
registerGuardedRoute('GET', `${PREFIX}/:id`)
registerGuardedRoute('DELETE', `${PREFIX}/:id`)

export const mediaRoutes = new Hono<{ Variables: Variables }>()
  .post(
    '/media/presign',
    authenticate,
    requireRole(AUTHENTICATED_ROLES),
    zValidator('json', presignMediaSchema, validationHook),
    async (c) => {
      const result = await presignMediaUpload(serviceContext(c), viewer(c), {
        kind: c.req.valid('json').kind,
        contentType: c.req.valid('json').content_type,
        sizeBytes: c.req.valid('json').size_bytes,
      })
      return c.json(
        ok({
          media_id: result.media.id,
          upload_url: result.uploadUrl,
          object_key: result.media.objectKey,
        }),
        201,
      )
    },
  )
  .post(
    '/media/:id/confirm',
    authenticate,
    requireRole(AUTHENTICATED_ROLES),
    zValidator('param', mediaIdParam, validationHook),
    async (c) => {
      const media = await confirmMediaUpload(serviceContext(c), viewer(c), c.req.valid('param').id)
      const result = await getMedia(serviceContext(c), viewer(c), media.id)
      return c.json(ok(serializeMedia(result.media, result.url)))
    },
  )
  .get(
    '/media/:id',
    authenticate,
    requireRole(AUTHENTICATED_ROLES),
    zValidator('param', mediaIdParam, validationHook),
    async (c) => {
      const result = await getMedia(serviceContext(c), viewer(c), c.req.valid('param').id)
      return c.json(ok(serializeMedia(result.media, result.url)))
    },
  )
  .delete(
    '/media/:id',
    authenticate,
    requireRole(AUTHENTICATED_ROLES),
    zValidator('param', mediaIdParam, validationHook),
    async (c) => {
      await deleteMedia(serviceContext(c), viewer(c), c.req.valid('param').id)
      return c.body(null, 204)
    },
  )
