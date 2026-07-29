import { createHash } from 'node:crypto'
import {
  appSettings,
  auditLogs,
  idempotencyRecords,
  notifications,
  passwordResetTokens,
  refreshTokens,
  users,
} from '@hola/db'
import {
  ERROR_CODE,
  JOB,
  NOTIFICATION_CHANNEL,
  RATE_LIMIT_BUCKET,
  SETTINGS_KEY,
  TEMPLATE_CODE,
  USER_ROLE,
} from '@hola/shared'
import { eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from './app.ts'
import { closeDatabase, db } from './config/db.ts'
import { logger } from './config/logger.ts'
import { renderMetrics, resetMetrics } from './config/metrics.ts'
import { queues } from './config/queues.ts'
import { closeRedis, keys, redis, safeRedis } from './config/redis.ts'
import { env } from './env.ts'
import {
  nextBookingCode,
  nextEmployeeNumber,
  nextInvoiceNumber,
  nextJournalEntryNumber,
  nextPaymentCode,
  nextRefundCode,
} from './lib/codes.ts'
import { err } from './lib/errors.ts'
import { HEADER, ok } from './lib/response.ts'
import { withTransaction } from './lib/transaction.ts'
import { errorHandler } from './middleware/error-handler.ts'
import { idempotency } from './middleware/idempotency.ts'
import type { AuthVariables } from './middleware/logger.ts'
import { rateLimit } from './middleware/rate-limit.ts'
import { type RequestVariables, requestId } from './middleware/request-id.ts'
import { createUser, findUserByEmail } from './modules/auth/auth.repository.ts'
import { login as loginService } from './modules/auth/auth.service.ts'
import { issueAccessToken, issueEmailVerificationToken } from './modules/auth/jwt.ts'
import { hashPassword } from './modules/auth/password.ts'
import { createOpaqueToken, hashOpaqueToken } from './modules/auth/tokens.ts'
import {
  notificationJobId,
  removeExpiredTokens,
  retryStuckNotifications,
  sendQueuedEmail,
  writeEmailNotification,
} from './modules/notifications/notification.service.ts'

const IDEMPOTENCY_KEYS = [
  '018f0000-0000-7000-8000-000000000101',
  '018f0000-0000-7000-8000-000000000102',
  '018f0000-0000-7000-8000-000000000103',
  '018f0000-0000-7000-8000-000000000104',
] as const

const IDEMPOTENCY_SCOPES = [
  'test.create',
  'test.fail-once',
  'test.scope-a',
  'test.scope-b',
] as const

const AUTH_EMAILS = [
  'customer.auth-test@hola.test',
  'rotate.auth-test@hola.test',
  'locked.auth-test@hola.test',
  'reset.auth-test@hola.test',
  'admin.auth-test@hola.test',
  'staff.auth-test@hola.test',
  'weak.auth-test@hola.test',
  'sessions.auth-test@hola.test',
  'rbac-customer.auth-test@hola.test',
  'notifications.auth-test@hola.test',
] as const

async function cleanIntegrationState(): Promise<void> {
  await db.delete(idempotencyRecords).where(inArray(idempotencyRecords.key, [...IDEMPOTENCY_KEYS]))
  await db
    .delete(appSettings)
    .where(
      inArray(appSettings.key, [
        SETTINGS_KEY.MIN_SUPPORTED_MOBILE_VERSION,
        SETTINGS_KEY.CANCELLATION_POLICY_TEXT,
        SETTINGS_KEY.BOOKING_HORIZON_DAYS,
      ]),
    )
  for (const scope of IDEMPOTENCY_SCOPES) {
    for (const key of IDEMPOTENCY_KEYS) {
      await redis.del(keys.idempotency(scope, key))
    }
  }
  await db.delete(users).where(inArray(users.email, [...AUTH_EMAILS]))
  for (const email of AUTH_EMAILS) {
    const identity = createHash('sha256').update(email, 'utf8').digest('hex')
    await Promise.all([
      redis.del(keys.rateLimit(RATE_LIMIT_BUCKET.AUTH_REGISTER, `ip:unknown:identity:${identity}`)),
      redis.del(keys.rateLimit(RATE_LIMIT_BUCKET.AUTH_LOGIN, `ip:unknown:identity:${identity}`)),
    ])
  }
  const weakIdentity = createHash('sha256').update('weak.auth-test@hola.test', 'utf8').digest('hex')
  await Promise.all([
    redis.del(
      keys.rateLimit(RATE_LIMIT_BUCKET.AUTH_REGISTER, `ip:unknown:identity:${weakIdentity}`),
    ),
    redis.del(
      keys.rateLimit(
        RATE_LIMIT_BUCKET.AUTH_OTP,
        `ip:unknown:identity:${createHash('sha256').update('+6281234567890', 'utf8').digest('hex')}`,
      ),
    ),
    redis.del(keys.rateLimit(RATE_LIMIT_BUCKET.AUTH_REFRESH, 'ip:unknown')),
  ])
}

beforeEach(async () => {
  await cleanIntegrationState()
  resetMetrics()
})

afterAll(async () => {
  await cleanIntegrationState()
  await Promise.allSettled([closeDatabase(), closeRedis()])
})

describe('transaction dan kode manusia', () => {
  it('BR-SV-13/BR-SV-14: afterCommit berjalan hanya setelah transaksi berhasil commit', async () => {
    const events: string[] = []
    const result = await withTransaction(db, async ({ tx, afterCommit }) => {
      await tx.execute(sql`SELECT 1`)
      events.push('inside')
      afterCommit(() => {
        events.push('after-commit')
      })
      expect(events).toEqual(['inside'])
      return 42
    })

    expect(result).toBe(42)
    expect(events).toEqual(['inside', 'after-commit'])
  })

  it('BR-SV-14: callback afterCommit tidak berjalan ketika transaksi rollback', async () => {
    let called = false
    await expect(
      withTransaction(db, async ({ afterCommit }) => {
        afterCommit(() => {
          called = true
        })
        throw new Error('paksa rollback')
      }),
    ).rejects.toThrow('paksa rollback')
    expect(called).toBe(false)
  })

  it('F0-37: seluruh kode memakai sequence PostgreSQL di dalam transaksi dan tanggal WITA', async () => {
    const at = new Date('2026-07-27T16:30:00.000Z')
    const codes = await withTransaction(db, async ({ tx }) =>
      Promise.all([
        nextBookingCode(tx, at),
        nextPaymentCode(tx, at),
        nextRefundCode(tx, at),
        nextInvoiceNumber(tx, at),
        nextJournalEntryNumber(tx, at),
        nextEmployeeNumber(tx),
      ]),
    )

    expect(codes[0]).toMatch(/^HB-260728-\d{4,}$/)
    expect(codes[1]).toMatch(/^HP-260728-\d{4,}$/)
    expect(codes[2]).toMatch(/^HR-260728-\d{3,}$/)
    expect(codes[3]).toMatch(/^INV-202607-\d{3,}$/)
    expect(codes[4]).toMatch(/^JE-202607-\d{5,}$/)
    expect(codes[5]).toMatch(/^EMP-\d{4,}$/)
  })
})

describe('rate limiter Redis', () => {
  type Variables = RequestVariables & AuthVariables

  function limiterApp(identifier: string): Hono<{ Variables: Variables }> {
    const limited = new Hono<{ Variables: Variables }>()
    limited.onError(errorHandler)
    limited.use('*', requestId)
    limited.use(
      '/limited',
      rateLimit(RATE_LIMIT_BUCKET.AUTH_REGISTER, { identifier: () => identifier }),
    )
    limited.get('/limited', (c) => c.json(ok({ allowed: true })))
    return limited
  }

  it('BR-RD-08: fixed window atomik membatasi request ke-4 dan memberi Retry-After', async () => {
    const identifier = 'integration-rate-limit'
    const redisKey = keys.rateLimit(RATE_LIMIT_BUCKET.AUTH_REGISTER, identifier)
    await redis.del(redisKey)

    const limited = limiterApp(identifier)
    for (let index = 0; index < 3; index++) {
      const response = await limited.request('/limited')
      expect(response.status).toBe(200)
    }
    const rejected = await limited.request('/limited')
    expect(rejected.status).toBe(429)
    expect(Number(rejected.headers.get(HEADER.RETRY_AFTER))).toBeGreaterThan(0)
    expect(await rejected.json()).toMatchObject({
      error: { code: ERROR_CODE.RATE_LIMITED },
    })
    expect(await redis.ttl(redisKey)).toBeGreaterThan(0)
    await redis.del(redisKey)
  })

  it('BR-RD-03/BR-RD-04: rate limiter fail-open dan mencatat metrik saat Redis putus', async () => {
    const allowed = await safeRedis(
      'rate_limit:integration',
      async () => {
        throw new Error('simulasi koneksi Redis putus')
      },
      true,
    )
    expect(allowed).toBe(true)
    expect(renderMetrics()).toContain('redis_degraded_total{feature="rate_limit:integration"} 1')
  })
})

describe('idempotency dua lapis', () => {
  type Variables = RequestVariables & AuthVariables

  function idempotencyApp(): {
    api: Hono<{ Variables: Variables }>
    calls: () => number
  } {
    let callCount = 0
    let failOnce = true
    const api = new Hono<{ Variables: Variables }>()
    api.onError(errorHandler)
    api.use('*', requestId)
    api.use('/create', idempotency('test.create'))
    api.post('/create', async (c) => {
      callCount++
      const body: unknown = await c.req.json()
      return c.json(ok({ call_count: callCount, received: body }), 201)
    })
    api.use('/fail-once', idempotency('test.fail-once'))
    api.post('/fail-once', (c) => {
      if (failOnce) {
        failOnce = false
        throw err.conflict('Gagal sementara.')
      }
      return c.json(ok({ recovered: true }), 201)
    })
    api.use('/scope-a', idempotency('test.scope-a'))
    api.post('/scope-a', (c) => c.json(ok({ operation: 'a' }), 201))
    api.use('/scope-b', idempotency('test.scope-b'))
    api.post('/scope-b', (c) => c.json(ok({ operation: 'b' }), 201))
    return { api, calls: () => callCount }
  }

  async function post(
    api: Hono<{ Variables: Variables }>,
    path: string,
    key: string | undefined,
    body: string,
  ): Promise<Response> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (key) headers[HEADER.IDEMPOTENCY_KEY] = key
    return api.request(path, { method: 'POST', headers, body })
  }

  it('F0-40: Redis replay identik dan hash JSON tidak bergantung urutan key', async () => {
    const { api, calls } = idempotencyApp()
    const key = IDEMPOTENCY_KEYS[0]
    const first = await post(api, '/create', key, '{"b":2,"a":1}')
    const replay = await post(api, '/create', key, '{ "a": 1, "b": 2 }')

    expect(first.status).toBe(201)
    expect(replay.status).toBe(201)
    expect(replay.headers.get(HEADER.IDEMPOTENT_REPLAY)).toBe('true')
    expect(await replay.json()).toEqual(await first.json())
    expect(calls()).toBe(1)
  })

  it('F0-40: PostgreSQL tetap menjamin replay ketika fast path Redis hilang', async () => {
    const { api, calls } = idempotencyApp()
    const key = IDEMPOTENCY_KEYS[1]
    const body = '{"amount":1000}'
    const first = await post(api, '/create', key, body)
    await redis.del(keys.idempotency('test.create', key))
    const replay = await post(api, '/create', key, body)

    expect(first.status).toBe(201)
    expect(replay.status).toBe(201)
    expect(replay.headers.get(HEADER.IDEMPOTENT_REPLAY)).toBe('true')
    expect(calls()).toBe(1)
  })

  it('F0-40: key sama dengan body berbeda ditolak IDEMPOTENCY_KEY_REUSED', async () => {
    const { api } = idempotencyApp()
    const key = IDEMPOTENCY_KEYS[0]
    await post(api, '/create', key, '{"amount":1000}')
    const response = await post(api, '/create', key, '{"amount":2000}')
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: { code: ERROR_CODE.IDEMPOTENCY_KEY_REUSED },
    })
  })

  it('E-7: endpoint idempoten menolak request tanpa Idempotency-Key', async () => {
    const { api } = idempotencyApp()
    const response = await post(api, '/create', undefined, '{}')
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      error: {
        code: ERROR_CODE.VALIDATION_ERROR,
        details: [{ path: 'headers.idempotency-key' }],
      },
    })
  })

  it('F0-40: kegagalan tidak meninggalkan claim in_progress permanen', async () => {
    const { api } = idempotencyApp()
    const key = IDEMPOTENCY_KEYS[2]
    const failed = await post(api, '/fail-once', key, '{}')
    const retried = await post(api, '/fail-once', key, '{}')
    expect(failed.status).toBe(409)
    expect(retried.status).toBe(201)
  })

  it('F0-40: scope berbeda tidak pernah mereplay response operasi lain', async () => {
    const { api } = idempotencyApp()
    const key = IDEMPOTENCY_KEYS[3]
    const first = await post(api, '/scope-a', key, '{}')
    const second = await post(api, '/scope-b', key, '{}')
    expect(first.status).toBe(201)
    expect(second.status).toBe(409)
    expect(await second.json()).toMatchObject({
      error: { code: ERROR_CODE.IDEMPOTENCY_KEY_REUSED },
    })
  })
})

describe('endpoint system', () => {
  it('F0-41: health, readiness, worker heartbeat, dan metrics mengikuti kontrak', async () => {
    const health = await app.request('/healthz')
    expect(health.status).toBe(200)
    expect(await health.json()).toMatchObject({ status: 'ok', app_env: 'local' })

    const ready = await app.request('/readyz')
    expect(ready.status).toBe(200)
    expect(await ready.json()).toMatchObject({
      status: 'ok',
      checks: { database: 'ok', redis: 'ok' },
    })

    await redis.del(keys.workerHeartbeat())
    const staleWorker = await app.request('/healthz/worker')
    expect(staleWorker.status).toBe(503)
    await redis.set(keys.workerHeartbeat(), '2026-07-28T12:00:00.000Z', 'EX', 90)
    const liveWorker = await app.request('/healthz/worker')
    expect(liveWorker.status).toBe(200)

    const deniedMetrics = await app.request('/internal/metrics')
    expect(deniedMetrics.status).toBe(403)
    const metrics = await app.request('/internal/metrics', {
      headers: { [HEADER.INTERNAL_TOKEN]: env.INTERNAL_TOKEN },
    })
    expect(metrics.status).toBe(200)
    expect(metrics.headers.get('content-type')).toContain('text/plain')
    await redis.del(keys.workerHeartbeat())
  })

  it('F0-42: config publik membaca allowlist setting dan memakai default tervalidasi', async () => {
    await db.insert(appSettings).values([
      {
        key: SETTINGS_KEY.MIN_SUPPORTED_MOBILE_VERSION,
        value: '2.3.0',
        description: 'test',
      },
      {
        key: SETTINGS_KEY.CANCELLATION_POLICY_TEXT,
        value: 'Pembatalan mengikuti kebijakan aktif.',
        description: 'test',
      },
      {
        key: SETTINGS_KEY.BOOKING_HORIZON_DAYS,
        value: 75,
        description: 'test',
      },
    ])

    const response = await app.request('/api/v1/config/public')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        midtrans_client_key: 'test-midtrans-client',
        midtrans_is_production: false,
        timezone: 'Asia/Makassar',
        min_supported_mobile_version: '2.3.0',
        cancellation_policy_text: 'Pembatalan mengikuti kebijakan aktif.',
        booking_horizon_days: 75,
        features: { whatsapp_enabled: false, otp_login_enabled: false },
      },
    })
    expect(response.headers.get(HEADER.RATELIMIT_LIMIT)).toBe('300')
  })
})

describe('Auth & RBAC', () => {
  const password = 'MagentaPaddle2026!'

  function authContext(now: Date = new Date()) {
    return {
      db,
      redis,
      redisKeys: keys,
      safeRedis,
      env,
      logger,
      queues,
      now,
      sleep: async () => undefined,
    }
  }

  async function register(email: string): Promise<void> {
    const response = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: 'Pemain Auth' }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: { message: 'Cek email untuk melanjutkan.' },
    })
  }

  async function mobileLogin(
    email: string,
    candidatePassword: string = password,
  ): Promise<{
    accessToken: string
    refreshToken: string
  }> {
    const response = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-platform': 'mobile-ios' },
      body: JSON.stringify({ identifier: email, password: candidatePassword }),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      data: { access_token: string; refresh_token: string; expires_in: number }
    }
    expect(body.data.expires_in).toBeLessThanOrEqual(900)
    return { accessToken: body.data.access_token, refreshToken: body.data.refresh_token }
  }

  it('F0-43/F0-44: argon2id+pepper, password contextual, dan register anti-enumerasi', async () => {
    const email = AUTH_EMAILS[0]
    await register(email)
    await register(email)

    const user = await findUserByEmail(db, email)
    expect(user?.role).toBe(USER_ROLE.CUSTOMER)
    expect(user?.passwordHash).toContain('$argon2id$')
    expect(user?.passwordHash).toContain('m=19456')
    expect(user?.passwordHash).toContain('t=2')
    expect(user?.passwordHash).toContain('p=1')

    const webLogin = await app.request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-platform': 'web' },
      body: JSON.stringify({ identifier: email, password }),
    })
    expect(webLogin.status).toBe(200)
    const refreshCookie = webLogin.headers.get('set-cookie') ?? ''
    expect(refreshCookie).toContain('HttpOnly')
    expect(refreshCookie).toContain('Secure')
    expect(refreshCookie).toContain('SameSite=Lax')
    expect(refreshCookie).toContain('Path=/api/v1/auth')

    const weak = await app.request('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'weak.auth-test@hola.test',
        password: 'password',
        full_name: 'password',
      }),
    })
    expect(weak.status).toBe(422)
  })

  it('F0-45: login salah mengunci pada kegagalan ke-10 tanpa mengungkap akun', async () => {
    const email = AUTH_EMAILS[2]
    await register(email)
    const base = new Date()
    for (let attempt = 0; attempt < 10; attempt++) {
      await expect(
        loginService(
          authContext(base),
          { identifier: email, password: 'SalahPassword2026!' },
          {
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
            deviceLabel: 'test',
          },
        ),
      ).rejects.toMatchObject({ code: ERROR_CODE.UNAUTHENTICATED })
    }
    const user = await findUserByEmail(db, email)
    expect(user?.failedLoginCount).toBe(10)
    expect(user?.lockedUntil?.getTime()).toBeGreaterThan(base.getTime())
    const lockNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.templateCode, TEMPLATE_CODE.AUTH_ACCOUNT_LOCKED))
    expect(lockNotifications).toHaveLength(2)
    expect(lockNotifications.map((row) => row.channel)).toEqual(
      expect.arrayContaining([NOTIFICATION_CHANNEL.EMAIL, NOTIFICATION_CHANNEL.INAPP]),
    )
  })

  it('F0-46/F0-47: refresh opaque berotasi, reuse mencabut family dan token_version', async () => {
    const email = AUTH_EMAILS[1]
    await register(email)
    const first = await mobileLogin(email)
    expect(first.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const stored = await db
      .select({ tokenHash: refreshTokens.tokenHash })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashOpaqueToken(first.refreshToken)))
    expect(stored).toHaveLength(1)

    const rotated = await app.request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-platform': 'mobile-ios' },
      body: JSON.stringify({ refresh_token: first.refreshToken }),
    })
    expect(rotated.status).toBe(200)
    const rotatedBody = (await rotated.json()) as { data: { refresh_token: string } }
    expect(rotatedBody.data.refresh_token).not.toBe(first.refreshToken)

    const reuse = await app.request('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-platform': 'mobile-ios' },
      body: JSON.stringify({ refresh_token: first.refreshToken }),
    })
    expect(reuse.status).toBe(401)
    expect(await reuse.json()).toMatchObject({ error: { code: ERROR_CODE.TOKEN_REVOKED } })

    const revokedAccess = await app.request('/api/v1/auth/sessions', {
      headers: { authorization: `Bearer ${first.accessToken}` },
    })
    expect(revokedAccess.status).toBe(401)
    const user = await findUserByEmail(db, email)
    expect(user?.tokenVersion).toBe(1)
  })

  it('F0-47 T-5: perangkat ke-11 mencabut refresh session tertua', async () => {
    const email = AUTH_EMAILS[6]
    await register(email)
    for (let device = 0; device < 11; device++) {
      await loginService(
        authContext(),
        { identifier: email, password },
        { ipAddress: '127.0.0.1', userAgent: `vitest-${device}`, deviceLabel: `device-${device}` },
      )
    }
    const user = await findUserByEmail(db, email)
    if (!user) throw new Error('fixture user hilang')
    const sessions = await db.select().from(refreshTokens).where(eq(refreshTokens.userId, user.id))
    expect(sessions.filter((session) => session.revokedAt === null)).toHaveLength(10)
    expect(sessions.filter((session) => session.revokedReason === 'max_sessions')).toHaveLength(1)
  })

  it('F0-48/F0-50/F0-51: session sendiri dapat dicabut, denylist aktif, dan route default-deny', async () => {
    const email = AUTH_EMAILS[0]
    await register(email)
    const session = await mobileLogin(email)
    const sessions = await app.request('/api/v1/auth/sessions', {
      headers: { authorization: `Bearer ${session.accessToken}` },
    })
    expect(sessions.status).toBe(200)
    const sessionsBody = (await sessions.json()) as {
      data: Array<{ id: string; token_hash?: string }>
    }
    expect(sessionsBody.data).toHaveLength(1)
    expect(sessionsBody.data[0]?.token_hash).toBeUndefined()
    const cachedUser = await findUserByEmail(db, email)
    if (!cachedUser) throw new Error('fixture user hilang')
    expect(await redis.get(keys.userContext(cachedUser.id))).toContain('tokenVersion')
    const sessionId = sessionsBody.data[0]?.id
    expect(sessionId).toBeDefined()

    const remove = await app.request(`/api/v1/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${session.accessToken}` },
    })
    expect(remove.status).toBe(204)
    const rbac = await app.request('/api/v1/admin/users', {
      headers: { authorization: `Bearer ${session.accessToken}` },
    })
    expect(rbac.status).toBe(403)
    const logout = await app.request('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.accessToken}`,
        'content-type': 'application/json',
        'x-client-platform': 'mobile-ios',
      },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    })
    expect(logout.status).toBe(204)
    const denied = await app.request('/api/v1/auth/sessions', {
      headers: { authorization: `Bearer ${session.accessToken}` },
    })
    expect(denied.status).toBe(401)
  })

  it('F0-49: reset token sekali-pakai mencabut sesi dan JWT verifikasi email memperbarui status', async () => {
    const email = AUTH_EMAILS[3]
    await register(email)
    const user = await findUserByEmail(db, email)
    expect(user).not.toBeNull()
    if (!user) throw new Error('fixture user hilang')
    const session = await mobileLogin(email)
    const resetToken = createOpaqueToken()
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashOpaqueToken(resetToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    const reset = await app.request('/api/v1/auth/password/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'LavenderOrbit2026!' }),
    })
    expect(reset.status).toBe(204)
    const replay = await app.request('/api/v1/auth/password/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: 'LavenderOrbit2026!' }),
    })
    expect(replay.status).toBe(401)
    const revoked = await app.request('/api/v1/auth/sessions', {
      headers: { authorization: `Bearer ${session.accessToken}` },
    })
    expect(revoked.status).toBe(401)

    const resetSession = await mobileLogin(email, 'LavenderOrbit2026!')
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id))
    const forgotKnown = await app.request('/api/v1/auth/password/forgot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const forgotUnknown = await app.request('/api/v1/auth/password/forgot', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'absent.auth-test@hola.test' }),
    })
    expect(forgotKnown.status).toBe(200)
    expect(forgotUnknown.status).toBe(200)
    expect(
      await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id)),
    ).toHaveLength(1)

    const changed = await app.request('/api/v1/auth/password/change', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${resetSession.accessToken}`,
        'content-type': 'application/json',
        'x-client-platform': 'mobile-ios',
      },
      body: JSON.stringify({
        current_password: 'LavenderOrbit2026!',
        new_password: 'CoralComet2026!',
      }),
    })
    expect(changed.status).toBe(200)
    const changedBody = (await changed.json()) as {
      data: { access_token: string; refresh_token: string }
    }
    expect(changedBody.data.refresh_token).toBeDefined()
    const currentSession = await app.request('/api/v1/auth/sessions', {
      headers: { authorization: `Bearer ${changedBody.data.access_token}` },
    })
    expect(currentSession.status).toBe(200)
    const emailRequest = await app.request('/api/v1/auth/email/verify/request', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${changedBody.data.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    expect(emailRequest.status).toBe(200)

    const verification = await issueEmailVerificationToken({ id: user.id, email }, env)
    const verify = await app.request('/api/v1/auth/email/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: verification }),
    })
    expect(verify.status).toBe(204)
    expect((await findUserByEmail(db, email))?.emailVerifiedAt).not.toBeNull()
  })

  it('F0-54/F0-55: OTP disabled; admin membuat, mengubah, dan mencabut sesi user dengan audit', async () => {
    const adminEmail = AUTH_EMAILS[4]
    const passwordHash = await hashPassword(password, env)
    await createUser(db, {
      role: USER_ROLE.ADMIN,
      email: adminEmail,
      phone: undefined,
      passwordHash,
      fullName: 'Admin Auth',
    })
    const admin = await mobileLogin(adminEmail)
    const otp = await app.request('/api/v1/auth/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '+6281234567890' }),
    })
    expect(otp.status).toBe(403)
    expect(await otp.json()).toMatchObject({ error: { code: ERROR_CODE.FEATURE_DISABLED } })

    const created = await app.request('/api/v1/admin/users', {
      method: 'POST',
      headers: { authorization: `Bearer ${admin.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: AUTH_EMAILS[5],
        password,
        full_name: 'Staff Auth',
        role: USER_ROLE.STAFF,
      }),
    })
    expect(created.status).toBe(201)
    const createdBody = (await created.json()) as { data: { id: string; role: string } }
    expect(createdBody.data.role).toBe(USER_ROLE.STAFF)

    const staff = await mobileLogin(AUTH_EMAILS[5])
    await register(AUTH_EMAILS[7])
    const customer = await mobileLogin(AUTH_EMAILS[7])
    const adminUsersMatrix = [
      { role: USER_ROLE.CUSTOMER, token: customer.accessToken, expectedStatus: 403 },
      { role: USER_ROLE.STAFF, token: staff.accessToken, expectedStatus: 403 },
      { role: USER_ROLE.ADMIN, token: admin.accessToken, expectedStatus: 200 },
    ] as const
    for (const row of adminUsersMatrix) {
      const response = await app.request('/api/v1/admin/users', {
        headers: { authorization: `Bearer ${row.token}` },
      })
      expect(response.status, `role ${row.role}`).toBe(row.expectedStatus)
    }

    const patched = await app.request(`/api/v1/admin/users/${createdBody.data.id}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${admin.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    })
    expect(patched.status).toBe(200)
    expect(await patched.json()).toMatchObject({ data: { status: 'suspended' } })
    expect((await findUserByEmail(db, AUTH_EMAILS[5]))?.tokenVersion).toBe(1)
    const revoke = await app.request(`/api/v1/admin/users/${createdBody.data.id}/revoke-sessions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${admin.accessToken}` },
    })
    expect(revoke.status).toBe(204)
    expect((await findUserByEmail(db, AUTH_EMAILS[5]))?.tokenVersion).toBe(2)
    const audit = await db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.entityId, createdBody.data.id))
    expect(audit.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        'admin.user_create',
        'admin.user_update',
        'admin.user_revoke_sessions',
      ]),
    )
  })

  it('F0-76: hanya admin mengelola app settings dan membaca audit log berhalaman', async () => {
    const adminEmail = AUTH_EMAILS[4]
    await createUser(db, {
      role: USER_ROLE.ADMIN,
      email: adminEmail,
      phone: undefined,
      passwordHash: await hashPassword(password, env),
      fullName: 'Admin Sistem',
    })
    const admin = await mobileLogin(adminEmail)
    await createUser(db, {
      role: USER_ROLE.STAFF,
      email: AUTH_EMAILS[5],
      phone: undefined,
      passwordHash: await hashPassword(password, env),
      fullName: 'Staff Sistem',
    })
    const staff = await mobileLogin(AUTH_EMAILS[5])
    await register(AUTH_EMAILS[7])
    const customer = await mobileLogin(AUTH_EMAILS[7])

    for (const token of [customer.accessToken, staff.accessToken]) {
      const denied = await app.request('/api/v1/admin/settings', {
        headers: { authorization: `Bearer ${token}` },
      })
      expect(denied.status).toBe(403)
    }

    const key = SETTINGS_KEY.BOOKING_HORIZON_DAYS
    const update = await app.request(`/api/v1/admin/settings/${key}`, {
      method: 'PUT',
      headers: { authorization: `Bearer ${admin.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ value: 45 }),
    })
    expect(update.status).toBe(200)
    expect(await update.json()).toMatchObject({
      data: { key, value: 45, updated_by_user_id: expect.any(String) },
    })

    const settings = await app.request('/api/v1/admin/settings', {
      headers: { authorization: `Bearer ${admin.accessToken}` },
    })
    expect(settings.status).toBe(200)
    expect(await settings.json()).toMatchObject({
      data: [expect.objectContaining({ key, value: 45 })],
    })

    const audit = await app.request(
      `/api/v1/admin/audit-logs?entity_type=app_setting&entity_id=${key}&action=admin.setting_update&sort=-created_at`,
      { headers: { authorization: `Bearer ${admin.accessToken}` } },
    )
    expect(audit.status).toBe(200)
    expect(await audit.json()).toMatchObject({
      // Audit append-only dapat memuat hasil eksekusi suite sebelumnya; yang
      // dikontrak adalah entri update ini tersedia, bukan hanya satu baris.
      data: expect.arrayContaining([
        expect.objectContaining({
          action: 'admin.setting_update',
          entity_type: 'app_setting',
          entity_id: key,
        }),
      ]),
      meta: { pagination: { mode: 'offset', page: 1, per_page: 25 } },
    })
  })
})

describe('notifikasi, mail, dan cleanup token', () => {
  const email = AUTH_EMAILS[9]
  const password = 'AzureRally2026!'

  async function createNotificationUser(): Promise<
    NonNullable<Awaited<ReturnType<typeof findUserByEmail>>>
  > {
    await createUser(db, {
      role: USER_ROLE.CUSTOMER,
      email,
      phone: undefined,
      passwordHash: await hashPassword(password, env),
      fullName: 'Pemain Notifikasi',
    })
    const user = await findUserByEmail(db, email)
    if (!user) throw new Error('fixture notification hilang')
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id))
    return user
  }

  it('F0-60/J-25: email dan inbox dedupe per kanal, inbox dapat dibaca, email tepat sekali', async () => {
    const user = await createNotificationUser()
    const now = new Date('2026-07-29T00:00:00.000Z')
    const emailNotification = await writeEmailNotification(
      db,
      {
        userId: user.id,
        toEmail: email,
        templateCode: TEMPLATE_CODE.AUTH_EMAIL_VERIFY,
        dedupeKey: `test:verify:${user.id}`,
        relatedType: 'user',
        relatedId: user.id,
      },
      now,
    )
    await writeEmailNotification(
      db,
      {
        userId: user.id,
        toEmail: email,
        templateCode: TEMPLATE_CODE.AUTH_EMAIL_VERIFY,
        dedupeKey: `test:verify:${user.id}`,
        relatedType: 'user',
        relatedId: user.id,
      },
      now,
    )
    if (!emailNotification) throw new Error('notifikasi email tidak dibuat')

    const deliveries: Array<{ to: string; subject: string; text: string }> = []
    const context = {
      db,
      env,
      logger,
      queues,
      now,
      mail: {
        send: async (message: { to: string; subject: string; text: string; html: string }) => {
          deliveries.push(message)
        },
      },
    }
    await sendQueuedEmail(context, emailNotification.id)
    await sendQueuedEmail(context, emailNotification.id)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]?.text).toContain('/verify-email?token=')

    const persisted = await db.select().from(notifications).where(eq(notifications.userId, user.id))
    expect(persisted).toHaveLength(2)
    expect(persisted.map((row) => row.channel)).toEqual(
      expect.arrayContaining([NOTIFICATION_CHANNEL.EMAIL, NOTIFICATION_CHANNEL.INAPP]),
    )
    expect(JSON.stringify(persisted)).not.toContain('token=')

    const issued = await issueAccessToken(
      { id: user.id, role: user.role, tokenVersion: user.tokenVersion },
      env,
    )
    const inbox = await app.request('/api/v1/me/notifications', {
      headers: { authorization: `Bearer ${issued.token}` },
    })
    expect(inbox.status).toBe(200)
    const inboxBody = (await inbox.json()) as {
      data: Array<{ id: string; read_at: string | null }>
    }
    expect(inboxBody.data).toHaveLength(1)
    const notificationId = inboxBody.data[0]?.id
    if (!notificationId) throw new Error('inbox fixture hilang')
    const read = await app.request(`/api/v1/me/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { authorization: `Bearer ${issued.token}` },
    })
    expect(read.status).toBe(204)
    const readAll = await app.request('/api/v1/me/notifications/read-all', {
      method: 'POST',
      headers: { authorization: `Bearer ${issued.token}` },
    })
    expect(readAll.status).toBe(204)
  })

  it('F0-61/F0-62: sweeper mengantrekan email queued dan J-31 menghapus reset kedaluwarsa', async () => {
    const user = await createNotificationUser()
    const now = new Date('2026-07-29T00:00:00.000Z')
    const notification = await writeEmailNotification(
      db,
      {
        userId: user.id,
        toEmail: email,
        templateCode: TEMPLATE_CODE.AUTH_PASSWORD_RESET,
        dedupeKey: `test:reset:${user.id}`,
        relatedType: 'user',
        relatedId: user.id,
      },
      new Date(now.getTime() - 6 * 60 * 1000),
    )
    if (!notification) throw new Error('notifikasi reset tidak dibuat')
    await db
      .update(notifications)
      .set({ createdAt: new Date(now.getTime() - 6 * 60 * 1000) })
      .where(eq(notifications.id, notification.id))
    await retryStuckNotifications({
      db,
      env,
      logger,
      queues,
      mail: { send: async () => undefined },
      now,
    })
    const queued = await queues.notification.getJob(notificationJobId(notification.id))
    expect(queued?.name).toBe(JOB.NOTIFICATION_SEND_EMAIL)

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashOpaqueToken(createOpaqueToken()),
      expiresAt: new Date(now.getTime() - 1),
    })
    await removeExpiredTokens({ db, now })
    expect(
      await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id)),
    ).toHaveLength(0)
  })
})
