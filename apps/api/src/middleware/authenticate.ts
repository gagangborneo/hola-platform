/** Middleware autentikasi JWT → denylist → context user. */
import type { MiddlewareHandler } from 'hono'
import { err } from '../lib/errors.ts'
import { denylistAccessToken, getAuthenticatedUserContext } from '../modules/auth/auth.service.ts'
import { verifyAccessToken } from '../modules/auth/jwt.ts'
import type { CoreDependencyVariables } from './core-dependencies.ts'
import type { AuthVariables } from './logger.ts'
import type { RequestVariables } from './request-id.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables

function bearerToken(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer ([^\s]+)$/i.exec(header)
  return match?.[1] ?? null
}

/**
 * Redis hanya lapis optimisasi/revokasi pendek. Validitas akhir tetap dicek
 * terhadap PostgreSQL melalui status dan token_version user.
 */
export const authenticate: MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
  const rawToken = bearerToken(c.req.header('Authorization'))
  if (!rawToken) throw err.unauthenticated()

  const core = c.get('core')
  const claims = await verifyAccessToken(rawToken, core.env)
  const authContext = { ...core, now: c.get('now') }
  if (await denylistAccessToken(authContext, claims)) throw err.tokenRevoked()

  const user = await getAuthenticatedUserContext(authContext, claims.userId)
  if (user?.status !== 'active' || user.tokenVersion !== claims.tokenVersion) {
    throw err.tokenRevoked()
  }

  c.set('userId', user.userId)
  c.set('role', user.role)
  if (user.cafeTenantId) c.set('cafeTenantId', user.cafeTenantId)
  if (user.employeeId) c.set('employeeId', user.employeeId)
  c.set('tokenJti', claims.jti)
  c.set('tokenIssuedAt', claims.issuedAt)
  c.set('tokenExpiresAt', claims.expiresAt)
  c.set('tokenVersion', claims.tokenVersion)
  await next()
}
