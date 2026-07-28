import { appSettings, idempotencyRecords } from '@hola/db'
import { ERROR_CODE, RATE_LIMIT_BUCKET, SETTINGS_KEY } from '@hola/shared'
import { inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from './app.ts'
import { closeDatabase, db } from './config/db.ts'
import { renderMetrics, resetMetrics } from './config/metrics.ts'
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
