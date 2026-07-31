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
import { courtIdParam, createCourtSchema, patchCourtSchema } from './courts.schema.ts'
import { createAdminCourt, patchAdminCourt } from './courts.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const PREFIX = '/api/v1/courts'

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
  if (!(now instanceof Date) || typeof userId !== 'string' || role !== USER_ROLE.ADMIN)
    throw err.unauthenticated()
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
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) throw err.validation({ field: 'If-Match' })
  return n
}

registerGuardedRoute('POST', PREFIX)
registerGuardedRoute('PATCH', `${PREFIX}/:id`)

export const courtsRoutes = new Hono<{ Variables: Variables }>()
  .post(
    '/courts',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('json', createCourtSchema, validationHook),
    async (c) => c.json(ok(await createAdminCourt(serviceContext(c), c.req.valid('json'))), 201),
  )
  .patch(
    '/courts/:id',
    authenticate,
    requireRole([USER_ROLE.ADMIN]),
    zValidator('param', courtIdParam, validationHook),
    zValidator('json', patchCourtSchema, validationHook),
    async (c) =>
      c.json(
        ok(
          await patchAdminCourt(serviceContext(c), {
            courtId: c.req.valid('param').id,
            version: ifMatch(c.req.header('if-match')),
            patch: c.req.valid('json'),
          }),
        ),
      ),
  )
