/** JWT access token HS256. Sumber: docs/05 § 4. */
import { randomUUID } from 'node:crypto'
import { USER_ROLE, type UserRole } from '@hola/shared'
import { decodeJwt, errors, type JWTPayload, jwtVerify, SignJWT } from 'jose'
import type { Env } from '../../env.ts'
import { err } from '../../lib/errors.ts'
import type { AccessTokenClaims } from './auth.types.ts'

const JWT_ISSUER = 'hola-api'
const JWT_AUDIENCE = 'hola-clients'
const encoder = new TextEncoder()

type TokenRole = UserRole

interface HolaAccessPayload extends JWTPayload {
  role?: TokenRole
  tv?: number
}

function secret(env: Pick<Env, 'JWT_ACCESS_SECRET'>): Uint8Array {
  return encoder.encode(env.JWT_ACCESS_SECRET)
}

function asClaims(payload: HolaAccessPayload): AccessTokenClaims {
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.role !== 'string' ||
    typeof payload.tv !== 'number' ||
    typeof payload.jti !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number' ||
    !Object.values(USER_ROLE).includes(payload.role as UserRole)
  ) {
    throw err.unauthenticated()
  }

  return {
    userId: payload.sub,
    role: payload.role as TokenRole,
    tokenVersion: payload.tv,
    jti: payload.jti,
    issuedAt: new Date(payload.iat * 1000),
    expiresAt: new Date(payload.exp * 1000),
  }
}

export async function issueAccessToken(
  user: { id: string; role: UserRole; tokenVersion: number },
  env: Pick<Env, 'JWT_ACCESS_SECRET' | 'JWT_ACCESS_TTL'>,
): Promise<{ token: string; claims: AccessTokenClaims }> {
  const token = await new SignJWT({ role: user.role, tv: user.tokenVersion })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(user.id)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(secret(env))

  return { token, claims: asClaims(decodeJwt(token) as HolaAccessPayload) }
}

export async function verifyAccessToken(
  token: string,
  env: Pick<Env, 'JWT_ACCESS_SECRET'>,
): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify(token, secret(env), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    return asClaims(payload as HolaAccessPayload)
  } catch (error) {
    if (error instanceof errors.JWTExpired) throw err.tokenExpired()
    if (error instanceof Error && error.name === 'AppError') throw error
    throw err.unauthenticated()
  }
}

/** TTL denylist harus tepat sisa hidup token, tidak pernah negatif. */
export function remainingJwtLifetimeSeconds(expiresAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000))
}

interface EmailVerificationPayload extends JWTPayload {
  purpose?: 'email_verification'
  email?: string
}

/**
 * Data model tidak memiliki tabel khusus token verifikasi email. JWT satu arah
 * berumur pendek cukup aman untuk aksi idempoten ini; token reset password
 * tetap memakai tabel sekali-pakai terpisah.
 */
export async function issueEmailVerificationToken(
  user: { id: string; email: string },
  env: Pick<Env, 'JWT_ACCESS_SECRET'>,
): Promise<string> {
  return new SignJWT({ purpose: 'email_verification', email: user.email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(user.id)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret(env))
}

export async function verifyEmailVerificationToken(
  token: string,
  env: Pick<Env, 'JWT_ACCESS_SECRET'>,
): Promise<{ userId: string; email: string }> {
  try {
    const { payload } = await jwtVerify(token, secret(env), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    const emailPayload = payload as EmailVerificationPayload
    if (
      typeof emailPayload.sub !== 'string' ||
      emailPayload.purpose !== 'email_verification' ||
      typeof emailPayload.email !== 'string'
    ) {
      throw err.unauthenticated()
    }
    return { userId: emailPayload.sub, email: emailPayload.email }
  } catch (error) {
    if (error instanceof errors.JWTExpired) throw err.tokenExpired()
    if (error instanceof Error && error.name === 'AppError') throw error
    throw err.unauthenticated()
  }
}
