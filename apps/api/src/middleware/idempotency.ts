/**
 * `Idempotency-Key` untuk POST dari client.
 * Sumber kebenaran: docs/04-API-CONTRACT.md § 8.
 *
 * Dua lapis, dan urutannya penting:
 *   1. Redis — fast path, TTL 24 jam. BOLEH hilang.
 *   2. `idempotency_records` di PostgreSQL — jaminan durabel lewat UNIQUE
 *      `key` (C-22). Inilah yang sebenarnya menjamin; Redis hanya menghemat
 *      satu round-trip database.
 *
 * Kalau Redis kosong, lapis 2 tetap menangkap duplikat lewat unique violation.
 * Itu sebabnya alurnya "INSERT lalu tangani konflik", bukan "SELECT lalu cek" —
 * pola kedua punya jendela balapan di antara keduanya.
 *
 * Endpoint yang tidak mendukung `Idempotency-Key` MENGABAIKANNYA, tidak error
 * (docs/04 § 8).
 */

import { createHash } from 'node:crypto'
import { idempotencyRecords } from '@hola/db'
import { IDEMPOTENCY_TTL_SECONDS } from '@hola/shared'
import { and, eq } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import { isValid as isUlid } from 'ulid'
import { z } from 'zod'
import { db } from '../config/db.ts'
import { logger } from '../config/logger.ts'
import { keys, redis, safeRedis } from '../config/redis.ts'
import { err, translateDbError, UniqueViolationError } from '../lib/errors.ts'
import { HEADER } from '../lib/response.ts'
import { addSeconds } from '../lib/time.ts'
import type { AuthVariables } from './logger.ts'
import type { RequestVariables } from './request-id.ts'

const storedResponseSchema = z.object({
  status: z.number().int().min(200).max(399),
  body: z.unknown(),
  requestHash: z.string().length(64),
})
type StoredResponse = z.infer<typeof storedResponseSchema>

const uuidSchema = z.uuid()

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson)
  if (typeof value !== 'object' || value === null) return value

  // Aman setelah guard object non-null; hanya akses enumerable key JSON.
  const object = value as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(object)
      .sort()
      .map((key) => [key, canonicalizeJson(object[key])]),
  )
}

/** SHA-256 dari JSON kanonik; urutan key/whitespace tidak mengubah hash. */
export function hashIdempotencyRequest(raw: string): string {
  let normalized = raw
  try {
    const parsed: unknown = JSON.parse(raw)
    normalized = JSON.stringify(canonicalizeJson(parsed))
  } catch {
    // Body malformed akan ditolak validator/error-handler. Hash raw tetap
    // deterministik agar middleware tidak mengubahnya menjadi error 500.
  }
  return createHash('sha256').update(normalized).digest('hex')
}

function validateKey(key: string | undefined): string {
  if (!key) {
    throw err.validation(
      [
        {
          path: 'headers.idempotency-key',
          code: 'required',
          message: 'Idempotency-Key wajib dikirim.',
        },
      ],
      'Idempotency-Key wajib dikirim.',
    )
  }
  if (!isUlid(key) && !uuidSchema.safeParse(key).success) {
    throw err.validation(
      [
        {
          path: 'headers.idempotency-key',
          code: 'invalid_format',
          message: 'Idempotency-Key harus berupa ULID atau UUID.',
        },
      ],
      'Idempotency-Key tidak valid.',
    )
  }
  return key
}

type Vars = RequestVariables & AuthVariables

/**
 * @param scope nama operasi (`booking.create`, `payment.create`, …) supaya key
 *        yang sama untuk operasi berbeda tidak bertabrakan.
 */
export function idempotency(scope: string): MiddlewareHandler<{ Variables: Vars }> {
  return async (c, next) => {
    const key = validateKey(c.req.header(HEADER.IDEMPOTENCY_KEY))

    const rawBody = await c.req.raw.clone().text()
    const requestHash = hashIdempotencyRequest(rawBody)
    const redisKey = keys.idempotency(scope, key)

    // ── Lapis 1: Redis fast path ─────────────────────────────────────────────
    const cached = await safeRedis<StoredResponse | null>(
      'idempotency',
      async () => {
        const raw = await redis.get(redisKey)
        if (!raw) return null
        let decoded: unknown
        try {
          decoded = JSON.parse(raw)
        } catch {
          decoded = null
        }
        const parsed = storedResponseSchema.safeParse(decoded)
        if (parsed.success) return parsed.data
        // BR-RD-11: cache dari versi lama/korup diperlakukan sebagai miss.
        await redis.del(redisKey)
        logger.warn({ scope }, 'cache idempotency tidak valid — dihapus')
        return null
      },
      null,
    )

    if (cached) {
      if (cached.requestHash !== requestHash) throw err.idempotencyKeyReused()
      c.header(HEADER.IDEMPOTENT_REPLAY, 'true')
      logger.info({ scope, request_id: c.get('requestId') }, 'idempotency replay (redis)')
      return c.json(cached.body as object, cached.status as 200)
    }

    // ── Lapis 2: klaim durabel di PostgreSQL ─────────────────────────────────
    const userId = c.get('userId')
    try {
      await db.insert(idempotencyRecords).values({
        key,
        scope,
        requestHash,
        ...(userId ? { userId } : {}),
        expiresAt: addSeconds(c.get('now'), IDEMPOTENCY_TTL_SECONDS),
      })
    } catch (rawError) {
      const error = translateDbError(rawError)
      if (!(error instanceof UniqueViolationError)) throw error

      // Key sudah dipakai. Body sama → putar ulang; body beda → tolak.
      const [existing] = await db.query.idempotencyRecords.findMany({
        where: (t, { eq }) => eq(t.key, key),
        limit: 1,
      })
      if (!existing || existing.requestHash !== requestHash) {
        throw err.idempotencyKeyReused()
      }
      // Schema fondasi saat ini UNIQUE hanya pada `key`, bukan `(scope,key)`.
      // Jangan pernah replay response operasi lain walaupun body kebetulan sama.
      if (existing.scope !== scope) throw err.idempotencyKeyReused()
      if (existing.responseStatus === null || existing.responseBody === null) {
        // Permintaan pertama masih berjalan (docs/04 § 8: status in_progress).
        throw err.conflict('Permintaan dengan kunci ini sedang diproses.')
      }
      c.header(HEADER.IDEMPOTENT_REPLAY, 'true')
      logger.info({ scope, request_id: c.get('requestId') }, 'idempotency replay (postgres)')
      return c.json(existing.responseBody as object, existing.responseStatus as 200)
    }

    // ── Jalankan permintaan, lalu simpan hasilnya ────────────────────────────
    await next()

    // Hanya response sukses yang disimpan. Kegagalan harus boleh dicoba lagi
    // dengan kunci yang sama — kalau tidak, satu kegagalan sementara mengunci
    // customer dari mencoba ulang checkout-nya.
    if (c.res.status >= 400) {
      await db
        .delete(idempotencyRecords)
        .where(
          and(
            eq(idempotencyRecords.key, key),
            eq(idempotencyRecords.scope, scope),
            eq(idempotencyRecords.requestHash, requestHash),
          ),
        )
      return
    }

    const body: unknown = await c.res.clone().json()
    const stored: StoredResponse = { status: c.res.status, body, requestHash }

    await db
      .update(idempotencyRecords)
      .set({ responseStatus: c.res.status, responseBody: body })
      .where(
        and(
          eq(idempotencyRecords.key, key),
          eq(idempotencyRecords.scope, scope),
          eq(idempotencyRecords.requestHash, requestHash),
        ),
      )

    await safeRedis(
      'idempotency',
      () => redis.set(redisKey, JSON.stringify(stored), 'EX', IDEMPOTENCY_TTL_SECONDS),
      null,
    )
  }
}
