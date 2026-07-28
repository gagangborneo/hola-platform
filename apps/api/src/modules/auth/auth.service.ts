/** Orkestrasi auth/session. Route hanya memvalidasi dan memanggil fungsi ini. */

import type { HolaDb } from '@hola/db'
import {
  type ChangePasswordInput,
  type ForgotPasswordInput,
  LOGIN_MAX_FAILED_ATTEMPTS,
  LOGIN_PROGRESSIVE_DELAY_SECONDS,
  type LoginInput,
  MAX_ACTIVE_SESSIONS,
  type RefreshInput,
  type RegisterInput,
  type ResetPasswordInput,
  TEMPLATE_CODE,
  USER_ROLE,
  USER_STATUS,
  type UserRole,
} from '@hola/shared'
import { err, UniqueViolationError } from '../../lib/errors.ts'
import { type Tx, withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import {
  createAndEnqueueEmailNotification,
  enqueueEmailNotification,
  writeEmailNotification,
} from '../notifications/notification.service.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import {
  consumePasswordResetToken,
  createCustomerProfile,
  createRefreshToken,
  createUser,
  findPasswordResetToken,
  findRefreshTokenByHash,
  findUserByEmail,
  findUserById,
  findUserByIdentifier,
  type IdentityUser,
  incrementTokenVersion,
  listActiveRefreshTokens,
  type RefreshToken,
  recordFailedLogin,
  resetSuccessfulLogin,
  revokeAllRefreshTokens,
  revokeRefreshFamily,
  revokeRefreshForRotation,
  revokeRefreshToken,
  revokeRefreshTokensById,
  updateEmailVerification,
  updatePassword,
} from './auth.repository.ts'
import type { AccessTokenClaims, AuthenticatedUserContext, Viewer } from './auth.types.ts'
import {
  issueAccessToken,
  remainingJwtLifetimeSeconds,
  verifyEmailVerificationToken,
} from './jwt.ts'
import {
  assertPasswordAllowed,
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from './password.ts'
import { createOpaqueToken, hashOpaqueToken } from './tokens.ts'

type AuthDependencies = Pick<
  CoreDependencies,
  'db' | 'env' | 'logger' | 'queues' | 'redis' | 'redisKeys' | 'safeRedis'
>

export interface AuthRequestContext {
  ipAddress: string | undefined
  userAgent: string | undefined
  deviceLabel: string | undefined
}

export interface AuthServiceContext extends AuthDependencies {
  now: Date
  /** Diinjeksi test agar progressive delay tidak memperlambat suite. */
  sleep?: (milliseconds: number) => Promise<void>
}

interface SessionResult {
  accessToken: string
  accessTokenClaims: AccessTokenClaims
  refreshToken: string
}

type SessionDependencies = Omit<AuthServiceContext, 'db'> & { db: HolaDb | Tx }

export interface SessionResponse extends SessionResult {
  expiresIn: number
  user: IdentityUser
}

function nowPlusDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function referralCodeFor(userId: string): string {
  return userId.replaceAll('-', '').slice(-6).toUpperCase()
}

function clientUser(user: IdentityUser): Pick<IdentityUser, 'id' | 'role' | 'tokenVersion'> {
  return { id: user.id, role: user.role, tokenVersion: user.tokenVersion }
}

function secondsFromClaims(claims: AccessTokenClaims, now: Date): number {
  // `iat`/`exp` ditulis jose pada detik yang sama, sehingga nilai yang dikirim
  // ke client tepat mengikuti TTL konfigurasi (15 menit = 900), bukan 899/901
  // karena pecahan milidetik saat request diproses.
  void now
  return Math.max(0, Math.round((claims.expiresAt.getTime() - claims.issuedAt.getTime()) / 1000))
}

async function queueAuthEmail(
  ctx: AuthServiceContext,
  user: IdentityUser,
  templateCode: (typeof TEMPLATE_CODE)[keyof typeof TEMPLATE_CODE],
  dedupeKey: string,
): Promise<void> {
  if (!user.email) return
  try {
    await createAndEnqueueEmailNotification(ctx, {
      userId: user.id,
      toEmail: user.email,
      templateCode,
      dedupeKey,
      relatedType: 'user',
      relatedId: user.id,
    })
  } catch (error) {
    ctx.logger.warn(
      { err: error, user_id: user.id, template_code: templateCode },
      'pencatatan notifikasi auth gagal',
    )
  }
}

export async function invalidateUserContext(
  ctx: Pick<AuthServiceContext, 'redis' | 'redisKeys' | 'safeRedis'>,
  userId: string,
): Promise<void> {
  await ctx.safeRedis(
    'auth_user_context_invalidate',
    () => ctx.redis.del(ctx.redisKeys.userContext(userId)),
    0,
  )
}

async function createSession(
  ctx: SessionDependencies,
  user: IdentityUser,
  request: AuthRequestContext,
  rotation: { familyId: string | undefined; parentId: string | undefined } = {
    familyId: undefined,
    parentId: undefined,
  },
): Promise<SessionResult> {
  const refreshToken = createOpaqueToken()
  const refresh = await createRefreshToken(ctx.db, {
    userId: user.id,
    tokenHash: hashOpaqueToken(refreshToken),
    familyId: rotation.familyId,
    parentId: rotation.parentId,
    deviceLabel: request.deviceLabel,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    expiresAt: nowPlusDays(ctx.now, ctx.env.REFRESH_TOKEN_TTL_DAYS),
    now: ctx.now,
  })

  const activeSessions = await listActiveRefreshTokens(ctx.db, user.id, ctx.now)
  const excess = activeSessions.slice(0, Math.max(0, activeSessions.length - MAX_ACTIVE_SESSIONS))
  await revokeRefreshTokensById(ctx.db, {
    ids: excess.map((session) => session.id),
    reason: 'max_sessions',
    now: ctx.now,
  })

  const issued = await issueAccessToken(clientUser(user), ctx.env)
  // `refresh` bernilai di sini untuk membuat invariant insert token eksplisit;
  // family id dibaca DB saat rotasi berikutnya.
  void refresh
  return { accessToken: issued.token, accessTokenClaims: issued.claims, refreshToken }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof UniqueViolationError
}

async function applyProgressiveDelay(
  ctx: AuthServiceContext,
  failedLoginCount: number,
): Promise<void> {
  if (failedLoginCount <= 3) return
  const index = Math.min(failedLoginCount - 4, LOGIN_PROGRESSIVE_DELAY_SECONDS.length - 1)
  const seconds = LOGIN_PROGRESSIVE_DELAY_SECONDS[index]
  if (seconds === undefined) return
  await (ctx.sleep ?? sleep)(seconds * 1000)
}

/** Register selalu 200 generik — termasuk ketika unique constraint menolak duplikat. */
export async function registerCustomer(
  ctx: AuthServiceContext,
  input: RegisterInput,
): Promise<{ message: string }> {
  assertPasswordAllowed({ password: input.password, email: input.email, fullName: input.full_name })
  const passwordHash = await hashPassword(input.password, ctx.env)

  let registered: IdentityUser | null = null
  try {
    registered = await withTransaction(
      ctx.db,
      async ({ tx, afterCommit }) => {
        const user = await createUser(tx, {
          role: USER_ROLE.CUSTOMER,
          email: input.email,
          phone: input.phone,
          passwordHash,
          fullName: input.full_name,
        })
        await createCustomerProfile(tx, { userId: user.id, referralCode: referralCodeFor(user.id) })
        if (user.email) {
          const notification = await writeEmailNotification(
            tx,
            {
              userId: user.id,
              toEmail: user.email,
              templateCode: TEMPLATE_CODE.AUTH_EMAIL_VERIFY,
              dedupeKey: `auth:email_verify:${user.id}`,
              relatedType: 'user',
              relatedId: user.id,
            },
            ctx.now,
          )
          if (notification) afterCommit(() => enqueueEmailNotification(ctx, notification.id))
        }
        return user
      },
      { logger: ctx.logger },
    )
  } catch (error) {
    if (!isUniqueViolation(error)) throw error
  }

  // Respons generik tidak perlu mengirim email pada pendaftaran duplikat;
  // ini mencegah alamat korban dipakai untuk memicu email berulang.
  void registered

  // Respons sengaja sama agar alamat email/nomor telepon tidak dapat dienumerasi.
  return { message: 'Cek email untuk melanjutkan.' }
}

export async function login(
  ctx: AuthServiceContext,
  input: LoginInput,
  request: AuthRequestContext,
): Promise<SessionResponse> {
  const user = await findUserByIdentifier(ctx.db, input.identifier)
  if (
    !user ||
    user.status !== USER_STATUS.ACTIVE ||
    (user.lockedUntil !== null && user.lockedUntil > ctx.now) ||
    user.passwordHash === null
  ) {
    throw err.unauthenticated('Email/nomor HP atau password tidak valid.')
  }

  const validPassword = await verifyPassword(user.passwordHash, input.password, ctx.env)
  if (!validPassword) {
    const failure = await recordFailedLogin(ctx.db, user.id)
    if (failure) {
      await applyProgressiveDelay(ctx, failure.failedLoginCount)
      if (failure.failedLoginCount >= LOGIN_MAX_FAILED_ATTEMPTS) {
        await queueAuthEmail(
          ctx,
          user,
          TEMPLATE_CODE.AUTH_ACCOUNT_LOCKED,
          `auth:account_locked:${user.id}:${failure.lockedUntil?.toISOString() ?? 'unknown'}`,
        )
        ctx.logger.warn({ user_id: user.id }, 'akun dikunci setelah login gagal berulang')
      }
    }
    throw err.unauthenticated('Email/nomor HP atau password tidak valid.')
  }

  if (passwordNeedsRehash(user.passwordHash)) {
    await updatePassword(ctx.db, user.id, await hashPassword(input.password, ctx.env))
  }
  await resetSuccessfulLogin(ctx.db, user.id, ctx.now)
  const session = await createSession(ctx, user, request)
  return {
    ...session,
    expiresIn: secondsFromClaims(session.accessTokenClaims, ctx.now),
    user,
  }
}

export async function refreshSession(
  ctx: AuthServiceContext,
  input: RefreshInput,
  request: AuthRequestContext,
): Promise<SessionResponse> {
  const rawToken = input.refresh_token
  if (!rawToken) throw err.unauthenticated()
  const token = await findRefreshTokenByHash(ctx.db, hashOpaqueToken(rawToken))
  if (!token) throw err.unauthenticated()
  const user = await findUserById(ctx.db, token.userId)
  if (!user || user.status !== USER_STATUS.ACTIVE) throw err.tokenRevoked()

  if (token.revokedAt !== null) {
    await withTransaction(ctx.db, async ({ tx, afterCommit }) => {
      await revokeRefreshFamily(tx, token.familyId, ctx.now)
      await incrementTokenVersion(tx, token.userId)
      await writeAuditLog(tx, {
        actorUserId: undefined,
        actorRole: undefined,
        action: 'auth.refresh_reuse_detected',
        entityType: 'refresh_token_family',
        entityId: token.familyId,
        before: undefined,
        after: { user_id: token.userId },
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        requestId: undefined,
      })
      afterCommit(() => invalidateUserContext(ctx, token.userId))
    })
    throw err.tokenRevoked()
  }
  if (token.expiresAt <= ctx.now) throw err.tokenExpired()

  const rotated = await withTransaction(ctx.db, async ({ tx, afterCommit }) => {
    const claimed = await revokeRefreshForRotation(tx, token.id, ctx.now)
    if (!claimed) {
      await revokeRefreshFamily(tx, token.familyId, ctx.now)
      await incrementTokenVersion(tx, token.userId)
      afterCommit(() => invalidateUserContext(ctx, token.userId))
      return null
    }
    const replacement = await createSession({ ...ctx, db: tx }, user, request, {
      familyId: token.familyId,
      parentId: token.id,
    })
    return replacement
  })
  if (!rotated) throw err.tokenRevoked()
  return {
    ...rotated,
    expiresIn: secondsFromClaims(rotated.accessTokenClaims, ctx.now),
    user,
  }
}

export async function logout(
  ctx: AuthServiceContext,
  viewer: Viewer,
  token: AccessTokenClaims,
  refreshToken: string | undefined,
  request: AuthRequestContext & { requestId: string | undefined },
): Promise<void> {
  let revokedSessionId: string | undefined
  if (refreshToken) {
    const refresh = await findRefreshTokenByHash(ctx.db, hashOpaqueToken(refreshToken))
    if (refresh && refresh.userId === viewer.userId) {
      const revoked = await revokeRefreshToken(ctx.db, {
        tokenId: refresh.id,
        userId: viewer.userId,
        reason: 'logout',
        now: ctx.now,
      })
      if (revoked) revokedSessionId = refresh.id
    }
  }

  await writeAuditLog(ctx.db, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'auth.logout',
    entityType: 'refresh_token',
    entityId: revokedSessionId,
    before: undefined,
    after: undefined,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    requestId: request.requestId,
  })

  const ttl = remainingJwtLifetimeSeconds(token.expiresAt, ctx.now)
  if (ttl > 0) {
    await ctx.safeRedis(
      'auth_token_denylist',
      () => ctx.redis.set(ctx.redisKeys.tokenDenylist(token.jti), '1', 'EX', ttl),
      null,
    )
  }
}

export async function logoutAll(
  ctx: AuthServiceContext,
  viewer: Viewer,
  request: AuthRequestContext & { requestId: string | undefined },
): Promise<void> {
  await withTransaction(ctx.db, async ({ tx, afterCommit }) => {
    await incrementTokenVersion(tx, viewer.userId)
    await revokeAllRefreshTokens(tx, {
      userId: viewer.userId,
      reason: 'logout_all',
      now: ctx.now,
      exceptTokenId: undefined,
    })
    await writeAuditLog(tx, {
      actorUserId: viewer.userId,
      actorRole: viewer.role,
      action: 'auth.logout_all',
      entityType: 'user',
      entityId: viewer.userId,
      before: undefined,
      after: undefined,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      requestId: request.requestId,
    })
    afterCommit(() => invalidateUserContext(ctx, viewer.userId))
  })
}

export async function listSessions(
  ctx: AuthServiceContext,
  viewer: Viewer,
): Promise<RefreshToken[]> {
  return listActiveRefreshTokens(ctx.db, viewer.userId, ctx.now)
}

export async function revokeSession(
  ctx: AuthServiceContext,
  viewer: Viewer,
  sessionId: string,
  request: AuthRequestContext & { requestId: string | undefined },
): Promise<void> {
  const revoked = await revokeRefreshToken(ctx.db, {
    tokenId: sessionId,
    userId: viewer.userId,
    reason: 'logout',
    now: ctx.now,
  })
  if (!revoked) throw err.notFound()
  await writeAuditLog(ctx.db, {
    actorUserId: viewer.userId,
    actorRole: viewer.role,
    action: 'auth.session_revoke',
    entityType: 'refresh_token',
    entityId: sessionId,
    before: undefined,
    after: undefined,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    requestId: request.requestId,
  })
}

export async function requestPasswordReset(
  ctx: AuthServiceContext,
  input: ForgotPasswordInput,
  _request: AuthRequestContext,
): Promise<{ message: string }> {
  const user = await findUserByEmail(ctx.db, input.email)
  if (
    user &&
    user.status === USER_STATUS.ACTIVE &&
    user.emailVerifiedAt !== null &&
    user.email !== null
  ) {
    await queueAuthEmail(
      ctx,
      user,
      TEMPLATE_CODE.AUTH_PASSWORD_RESET,
      `auth:password_reset:${user.id}:${ctx.now.toISOString()}`,
    )
  }
  return { message: 'Jika akun tersedia, instruksi akan dikirim ke email Anda.' }
}

export async function resetPassword(
  ctx: AuthServiceContext,
  input: ResetPasswordInput,
): Promise<void> {
  const reset = await findPasswordResetToken(ctx.db, hashOpaqueToken(input.token))
  if (!reset || reset.consumedAt !== null || reset.expiresAt <= ctx.now) throw err.tokenExpired()
  const user = await findUserById(ctx.db, reset.userId)
  if (!user || user.email === null) throw err.tokenExpired()
  assertPasswordAllowed({ password: input.password, email: user.email, fullName: user.fullName })
  const passwordHash = await hashPassword(input.password, ctx.env)

  const consumed = await withTransaction(
    ctx.db,
    async ({ tx, afterCommit }) => {
      const claimed = await consumePasswordResetToken(tx, reset.id, ctx.now)
      if (!claimed) return false
      await updatePassword(tx, user.id, passwordHash)
      await incrementTokenVersion(tx, user.id)
      await revokeAllRefreshTokens(tx, {
        userId: user.id,
        reason: 'password_reset',
        now: ctx.now,
        exceptTokenId: undefined,
      })
      await writeAuditLog(tx, {
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.password_reset',
        entityType: 'user',
        entityId: user.id,
        before: undefined,
        after: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        requestId: undefined,
      })
      if (user.email) {
        const notification = await writeEmailNotification(
          tx,
          {
            userId: user.id,
            toEmail: user.email,
            templateCode: TEMPLATE_CODE.AUTH_PASSWORD_CHANGED,
            dedupeKey: `auth:password_changed:${user.id}:${reset.id}`,
            relatedType: 'user',
            relatedId: user.id,
          },
          ctx.now,
        )
        if (notification) afterCommit(() => enqueueEmailNotification(ctx, notification.id))
      }
      afterCommit(() => invalidateUserContext(ctx, user.id))
      return true
    },
    { logger: ctx.logger },
  )
  if (!consumed) throw err.tokenExpired()
}

export async function changePassword(
  ctx: AuthServiceContext,
  viewer: Viewer,
  input: ChangePasswordInput,
  request: AuthRequestContext,
): Promise<SessionResult & { expiresIn: number }> {
  const user = await findUserById(ctx.db, viewer.userId)
  if (!user?.passwordHash) throw err.unauthenticated()
  if (!(await verifyPassword(user.passwordHash, input.current_password, ctx.env))) {
    throw err.unauthenticated('Password saat ini tidak valid.')
  }
  assertPasswordAllowed({
    password: input.new_password,
    email: user.email ?? undefined,
    fullName: user.fullName,
  })
  const passwordHash = await hashPassword(input.new_password, ctx.env)
  const updated = await withTransaction(
    ctx.db,
    async ({ tx, afterCommit }) => {
      await updatePassword(tx, user.id, passwordHash)
      await incrementTokenVersion(tx, user.id)
      await revokeAllRefreshTokens(tx, {
        userId: user.id,
        reason: 'password_change',
        now: ctx.now,
        exceptTokenId: undefined,
      })
      const refreshedUser = await findUserById(tx, user.id)
      if (!refreshedUser) throw err.unauthenticated()
      await writeAuditLog(tx, {
        actorUserId: user.id,
        actorRole: viewer.role,
        action: 'auth.password_change',
        entityType: 'user',
        entityId: user.id,
        before: undefined,
        after: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        requestId: undefined,
      })
      if (user.email) {
        const notification = await writeEmailNotification(
          tx,
          {
            userId: user.id,
            toEmail: user.email,
            templateCode: TEMPLATE_CODE.AUTH_PASSWORD_CHANGED,
            dedupeKey: `auth:password_changed:${user.id}:${ctx.now.toISOString()}`,
            relatedType: 'user',
            relatedId: user.id,
          },
          ctx.now,
        )
        if (notification) afterCommit(() => enqueueEmailNotification(ctx, notification.id))
      }
      afterCommit(() => invalidateUserContext(ctx, user.id))
      return createSession({ ...ctx, db: tx }, refreshedUser, request)
    },
    { logger: ctx.logger },
  )
  return { ...updated, expiresIn: secondsFromClaims(updated.accessTokenClaims, ctx.now) }
}

export async function requestEmailVerification(
  ctx: AuthServiceContext,
  viewer: Viewer,
): Promise<{ message: string }> {
  const user = await findUserById(ctx.db, viewer.userId)
  if (!user || user.email === null) throw err.validation({ email: 'Email tidak tersedia' })
  await queueAuthEmail(ctx, user, TEMPLATE_CODE.AUTH_EMAIL_VERIFY, `auth:email_verify:${user.id}`)
  return { message: 'Instruksi verifikasi telah dikirim jika email tersedia.' }
}

export async function verifyEmail(ctx: AuthServiceContext, token: string): Promise<void> {
  const claims = await verifyEmailVerificationToken(token, ctx.env)
  const user = await findUserById(ctx.db, claims.userId)
  if (!user || user.email?.toLowerCase() !== claims.email.toLowerCase()) throw err.unauthenticated()
  await updateEmailVerification(ctx.db, user.id, ctx.now)
  await invalidateUserContext(ctx, user.id)
}

function parseCachedUserContext(value: string): AuthenticatedUserContext | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (
      typeof record.userId !== 'string' ||
      !Object.values(USER_ROLE).includes(record.role as UserRole) ||
      !Object.values(USER_STATUS).includes(
        record.status as (typeof USER_STATUS)[keyof typeof USER_STATUS],
      ) ||
      typeof record.tokenVersion !== 'number'
    ) {
      return null
    }
    return {
      userId: record.userId,
      role: record.role as UserRole,
      status: record.status as (typeof USER_STATUS)[keyof typeof USER_STATUS],
      tokenVersion: record.tokenVersion,
      cafeTenantId: typeof record.cafeTenantId === 'string' ? record.cafeTenantId : undefined,
      employeeId: typeof record.employeeId === 'string' ? record.employeeId : undefined,
    }
  } catch {
    return null
  }
}

/** Redis hanya cache: miss/degradasi selalu kembali ke PostgreSQL. */
export async function getAuthenticatedUserContext(
  ctx: AuthServiceContext,
  userId: string,
): Promise<AuthenticatedUserContext | null> {
  const key = ctx.redisKeys.userContext(userId)
  const cached = await ctx.safeRedis('auth_user_context_read', () => ctx.redis.get(key), null)
  if (cached) {
    const parsed = parseCachedUserContext(cached)
    if (parsed) return parsed
  }

  const user = await findUserById(ctx.db, userId)
  if (!user) return null
  // `employees` dan `cafe_tenants` baru dibuat bersama modulnya; sampai saat
  // itu tenant tidak pernah lolos requireRole karena cafeTenantId kosong.
  const context: AuthenticatedUserContext = {
    userId: user.id,
    role: user.role,
    status: user.status,
    tokenVersion: user.tokenVersion,
    cafeTenantId: undefined,
    employeeId: undefined,
  }
  await ctx.safeRedis(
    'auth_user_context_write',
    () => ctx.redis.set(key, JSON.stringify(context), 'EX', 60),
    null,
  )
  return context
}

export async function denylistAccessToken(
  ctx: AuthServiceContext,
  claims: AccessTokenClaims,
): Promise<boolean> {
  const denied = await ctx.safeRedis(
    'auth_token_denylist_read',
    () => ctx.redis.get(ctx.redisKeys.tokenDenylist(claims.jti)),
    null,
  )
  return denied !== null
}
