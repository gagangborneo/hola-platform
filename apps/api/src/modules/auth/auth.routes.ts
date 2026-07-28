/** Endpoint auth/session. Sumber kontrak: docs/04 § 9.1 dan docs/05. */

import { createHash } from 'node:crypto'
import { RATE_LIMIT_BUCKET, type RefreshInput, USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { type Context, Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { err } from '../../lib/errors.ts'
import { ok } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import { rateLimit } from '../../middleware/rate-limit.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  registerSchema,
  requestEmailVerificationSchema,
  resetPasswordSchema,
  revokeSessionParam,
  verifyEmailSchema,
} from './auth.schema.ts'
import { serializeAuthenticatedUser, serializeSession } from './auth.serializer.ts'
import {
  changePassword,
  listSessions,
  login,
  logout,
  logoutAll,
  refreshSession,
  registerCustomer,
  requestEmailVerification,
  requestPasswordReset,
  resetPassword,
  revokeSession,
  verifyEmail,
} from './auth.service.ts'
import type { AccessTokenClaims, Viewer } from './auth.types.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables

const AUTH_ROUTE_PREFIX = '/api/v1/auth'
const REFRESH_COOKIE = 'hola_refresh_token'
const AUTHENTICATED_ROLES = Object.values(USER_ROLE)

function requestIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  )
}

function requestContext(c: { req: { header: (name: string) => string | undefined } }): {
  ipAddress: string
  userAgent: string | undefined
  deviceLabel: string | undefined
} {
  return {
    ipAddress: requestIp(c),
    userAgent: c.req.header('user-agent'),
    deviceLabel: c.req.header('x-client-platform'),
  }
}

function isMobile(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const platform = c.req.header('x-client-platform')
  return platform === 'mobile-ios' || platform === 'mobile-android'
}

function parsedBodyIdentifier(value: unknown, field: 'identifier' | 'email' | 'phone'): string {
  if (typeof value !== 'object' || value === null) return 'unknown'
  const raw = (value as Record<string, unknown>)[field]
  return typeof raw === 'string' && raw.length > 0 ? raw.trim().toLowerCase() : 'unknown'
}

async function authRateLimitIdentifier(
  c: { req: { raw: Request; header: (name: string) => string | undefined } },
  fields: ReadonlyArray<'identifier' | 'email' | 'phone'>,
): Promise<string> {
  let body: unknown
  try {
    body = await c.req.raw.clone().json()
  } catch {
    body = null
  }
  const identifier =
    fields.map((field) => parsedBodyIdentifier(body, field)).find((value) => value !== 'unknown') ??
    'unknown'
  // Key Redis tidak perlu menyimpan email/nomor HP mentah.
  const digest = createHash('sha256').update(identifier, 'utf8').digest('hex')
  return `ip:${requestIp(c)}:identity:${digest}`
}

function validationHook(result: { success: boolean; error?: unknown }) {
  if (!result.success) throw result.error
}

async function parseRefreshBody(c: {
  req: { text: () => Promise<string> }
}): Promise<RefreshInput> {
  const text = await c.req.text()
  if (text.length === 0) return refreshSchema.parse({})
  try {
    return refreshSchema.parse(JSON.parse(text) as unknown)
  } catch (error) {
    if (error instanceof SyntaxError) throw err.of('MALFORMED_REQUEST')
    throw error
  }
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

function accessClaims(c: {
  get: (
    key: 'userId' | 'role' | 'tokenJti' | 'tokenIssuedAt' | 'tokenExpiresAt' | 'tokenVersion',
  ) => unknown
}): AccessTokenClaims {
  const userId = c.get('userId')
  const role = c.get('role')
  const jti = c.get('tokenJti')
  const issuedAt = c.get('tokenIssuedAt')
  const expiresAt = c.get('tokenExpiresAt')
  const tokenVersion = c.get('tokenVersion')
  if (
    typeof userId !== 'string' ||
    !AUTHENTICATED_ROLES.includes(role as (typeof AUTHENTICATED_ROLES)[number]) ||
    typeof jti !== 'string' ||
    !(issuedAt instanceof Date) ||
    !(expiresAt instanceof Date) ||
    typeof tokenVersion !== 'number'
  ) {
    throw err.unauthenticated()
  }
  return {
    userId,
    role: role as (typeof AUTHENTICATED_ROLES)[number],
    jti,
    issuedAt,
    expiresAt,
    tokenVersion,
  }
}

function setRefreshCookie(c: Context, token: string, ttlDays: number, domain: string): void {
  setCookie(c, REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    domain,
    path: '/api/v1/auth',
    maxAge: ttlDays * 24 * 60 * 60,
  })
}

function clearRefreshCookie(c: Context, domain: string): void {
  setCookie(c, REFRESH_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    domain,
    path: '/api/v1/auth',
    maxAge: 0,
  })
}

function assertCookieOrigin(c: {
  req: { header: (name: string) => string | undefined }
  get: (key: 'core') => { env: { CORS_ORIGINS: readonly string[] } }
}): void {
  const origin = c.req.header('origin')
  if (!origin || !c.get('core').env.CORS_ORIGINS.includes(origin)) throw err.forbidden()
}

function sessionData(
  session: {
    accessToken: string
    refreshToken: string
    expiresIn: number
    user: Parameters<typeof serializeAuthenticatedUser>[0]
  },
  mobile: boolean,
) {
  return {
    access_token: session.accessToken,
    expires_in: session.expiresIn,
    user: serializeAuthenticatedUser(session.user),
    ...(mobile ? { refresh_token: session.refreshToken } : {}),
  }
}

export const authRoutes = new Hono<{ Variables: Variables }>()
  .post(
    '/auth/register',
    rateLimit(RATE_LIMIT_BUCKET.AUTH_REGISTER, {
      identifier: (c) => authRateLimitIdentifier(c, ['email', 'phone']),
    }),
    zValidator('json', registerSchema, validationHook),
    async (c) => {
      const data = await registerCustomer(
        { ...c.get('core'), now: c.get('now') },
        c.req.valid('json'),
      )
      return c.json(ok(data))
    },
  )
  .post(
    '/auth/login',
    rateLimit(RATE_LIMIT_BUCKET.AUTH_LOGIN, {
      identifier: (c) => authRateLimitIdentifier(c, ['identifier']),
    }),
    zValidator('json', loginSchema, validationHook),
    async (c) => {
      const session = await login(
        { ...c.get('core'), now: c.get('now') },
        c.req.valid('json'),
        requestContext(c),
      )
      const mobile = isMobile(c)
      if (!mobile)
        setRefreshCookie(
          c,
          session.refreshToken,
          c.get('core').env.REFRESH_TOKEN_TTL_DAYS,
          c.get('core').env.COOKIE_DOMAIN,
        )
      return c.json(ok(sessionData(session, mobile)))
    },
  )
  .post('/auth/refresh', rateLimit(RATE_LIMIT_BUCKET.AUTH_REFRESH), async (c) => {
    const cookieToken = getCookie(c, REFRESH_COOKIE)
    if (cookieToken) assertCookieOrigin(c)
    const body = await parseRefreshBody(c)
    const token = cookieToken ?? body.refresh_token
    const session = await refreshSession(
      { ...c.get('core'), now: c.get('now') },
      { refresh_token: token },
      requestContext(c),
    )
    const mobile = isMobile(c)
    if (!mobile)
      setRefreshCookie(
        c,
        session.refreshToken,
        c.get('core').env.REFRESH_TOKEN_TTL_DAYS,
        c.get('core').env.COOKIE_DOMAIN,
      )
    return c.json(ok(sessionData(session, mobile)))
  })
  .post(
    '/auth/otp/request',
    rateLimit(RATE_LIMIT_BUCKET.AUTH_OTP, {
      identifier: (c) => authRateLimitIdentifier(c, ['phone']),
    }),
    zValidator('json', otpRequestSchema, validationHook),
    () => {
      throw err.featureDisabled('Login OTP belum aktif.')
    },
  )
  .post('/auth/otp/verify', zValidator('json', otpVerifySchema, validationHook), () => {
    throw err.featureDisabled('Login OTP belum aktif.')
  })
  .post(
    '/auth/password/forgot',
    zValidator('json', forgotPasswordSchema, validationHook),
    async (c) => {
      const data = await requestPasswordReset(
        { ...c.get('core'), now: c.get('now') },
        c.req.valid('json'),
        requestContext(c),
      )
      return c.json(ok(data))
    },
  )
  .post(
    '/auth/password/reset',
    zValidator('json', resetPasswordSchema, validationHook),
    async (c) => {
      await resetPassword({ ...c.get('core'), now: c.get('now') }, c.req.valid('json'))
      return c.body(null, 204)
    },
  )
  .post('/auth/email/verify', zValidator('json', verifyEmailSchema, validationHook), async (c) => {
    await verifyEmail({ ...c.get('core'), now: c.get('now') }, c.req.valid('json').token)
    return c.body(null, 204)
  })

registerGuardedRoute('POST', `${AUTH_ROUTE_PREFIX}/logout`)
registerGuardedRoute('POST', `${AUTH_ROUTE_PREFIX}/logout-all`)
registerGuardedRoute('GET', `${AUTH_ROUTE_PREFIX}/sessions`)
registerGuardedRoute('DELETE', `${AUTH_ROUTE_PREFIX}/sessions/:id`)
registerGuardedRoute('POST', `${AUTH_ROUTE_PREFIX}/password/change`)
registerGuardedRoute('POST', `${AUTH_ROUTE_PREFIX}/email/verify/request`)

authRoutes.post('/auth/logout', authenticate, requireRole(AUTHENTICATED_ROLES), async (c) => {
  const cookieToken = getCookie(c, REFRESH_COOKIE)
  if (cookieToken) assertCookieOrigin(c)
  const body = await parseRefreshBody(c)
  await logout(
    { ...c.get('core'), now: c.get('now') },
    viewer(c),
    accessClaims(c),
    cookieToken ?? body.refresh_token,
    { ...requestContext(c), requestId: c.get('requestId') },
  )
  clearRefreshCookie(c, c.get('core').env.COOKIE_DOMAIN)
  return c.body(null, 204)
})

authRoutes.post('/auth/logout-all', authenticate, requireRole(AUTHENTICATED_ROLES), async (c) => {
  await logoutAll({ ...c.get('core'), now: c.get('now') }, viewer(c), {
    ...requestContext(c),
    requestId: c.get('requestId'),
  })
  clearRefreshCookie(c, c.get('core').env.COOKIE_DOMAIN)
  return c.body(null, 204)
})

authRoutes.get('/auth/sessions', authenticate, requireRole(AUTHENTICATED_ROLES), async (c) => {
  const sessions = await listSessions({ ...c.get('core'), now: c.get('now') }, viewer(c))
  return c.json(ok(sessions.map(serializeSession)))
})

authRoutes.delete(
  '/auth/sessions/:id',
  authenticate,
  requireRole(AUTHENTICATED_ROLES),
  zValidator('param', revokeSessionParam, validationHook),
  async (c) => {
    await revokeSession(
      { ...c.get('core'), now: c.get('now') },
      viewer(c),
      c.req.valid('param').id,
      { ...requestContext(c), requestId: c.get('requestId') },
    )
    return c.body(null, 204)
  },
)

authRoutes.post(
  '/auth/password/change',
  authenticate,
  requireRole(AUTHENTICATED_ROLES),
  zValidator('json', changePasswordSchema, validationHook),
  async (c) => {
    const input = c.req.valid('json')
    const cookieToken = getCookie(c, REFRESH_COOKIE)
    if (cookieToken) assertCookieOrigin(c)
    const data = await changePassword(
      { ...c.get('core'), now: c.get('now') },
      viewer(c),
      input,
      requestContext(c),
    )
    const mobile = isMobile(c)
    if (!mobile)
      setRefreshCookie(
        c,
        data.refreshToken,
        c.get('core').env.REFRESH_TOKEN_TTL_DAYS,
        c.get('core').env.COOKIE_DOMAIN,
      )
    return c.json(
      ok({
        access_token: data.accessToken,
        expires_in: data.expiresIn,
        ...(mobile ? { refresh_token: data.refreshToken } : {}),
      }),
    )
  },
)

authRoutes.post(
  '/auth/email/verify/request',
  authenticate,
  requireRole(AUTHENTICATED_ROLES),
  zValidator('json', requestEmailVerificationSchema, validationHook),
  async (c) => {
    const data = await requestEmailVerification({ ...c.get('core'), now: c.get('now') }, viewer(c))
    return c.json(ok(data))
  },
)
