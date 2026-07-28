/**
 * Rate limit fixed window.
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 4.5, docs/16 BR-RD-08.
 *
 * Memakai Lua `EVALSHA` (BR-RD-08): INCR lalu EXPIRE sebagai dua perintah
 * terpisah punya jendela di mana counter sudah naik tetapi TTL-nya belum
 * terpasang. Kalau proses mati tepat di sana, key-nya abadi — dan dengan
 * `maxmemory-policy noeviction`, key abadi menumpuk sampai Redis menolak write.
 * Satu script atomik menutup jendela itu.
 *
 * FAIL-OPEN, tanpa pengecualian (BR-RD-04, RK-0-09): kalau Redis tidak
 * terjangkau, request DIIZINKAN. Menolak seluruh traffic karena Redis hiccup
 * jauh lebih buruk daripada kehilangan proteksi rate limit sementara.
 */
import { RATE_LIMIT, type RateLimitBucket } from '@hola/shared'
import type { Context, MiddlewareHandler } from 'hono'
import { logger } from '../config/logger.ts'
import { keys, redis, safeRedis } from '../config/redis.ts'
import { env } from '../env.ts'
import { err } from '../lib/errors.ts'
import { HEADER } from '../lib/response.ts'
import type { AuthVariables } from './logger.ts'
import type { RequestVariables } from './request-id.ts'

/**
 * INCR + EXPIRE atomik.
 * KEYS[1] = key counter, ARGV[1] = window dalam detik.
 * Mengembalikan {hitungan saat ini, sisa TTL}.
 */
const FIXED_WINDOW_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return {current, redis.call('TTL', KEYS[1])}
`

let scriptSha: string | null = null

/** Muat script sekali; pakai EVALSHA setelahnya agar tidak mengirim ulang body. */
async function loadScript(): Promise<string | null> {
  if (scriptSha) return scriptSha
  return safeRedis(
    'rate_limit_script',
    async () => {
      // ioredis mengetik `script()` sebagai unknown; SCRIPT LOAD selalu
      // mengembalikan sha1 hex.
      scriptSha = (await redis.script('LOAD', FIXED_WINDOW_LUA)) as string
      return scriptSha
    },
    null,
  )
}

interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetSeconds: number
}

async function consume(bucket: RateLimitBucket, identifier: string): Promise<RateLimitResult> {
  const config = RATE_LIMIT[bucket]
  const key = keys.rateLimit(bucket, identifier)

  const fallback: RateLimitResult = {
    allowed: true, // fail-open
    limit: config.limit,
    remaining: config.limit,
    resetSeconds: config.windowSeconds,
  }

  const sha = await loadScript()
  if (!sha) return fallback

  return safeRedis(
    `rate_limit:${bucket}`,
    async () => {
      let raw: unknown
      try {
        raw = await redis.evalsha(sha, 1, key, String(config.windowSeconds))
      } catch (error) {
        // Redis di-restart → script cache kosong. Muat ulang sekali, jangan
        // menjatuhkan request hanya karena NOSCRIPT.
        if (error instanceof Error && error.message.includes('NOSCRIPT')) {
          scriptSha = null
          const reloaded = await loadScript()
          if (!reloaded) return fallback
          raw = await redis.evalsha(reloaded, 1, key, String(config.windowSeconds))
        } else {
          throw error
        }
      }
      const [count, ttl] = raw as [number, number]
      return {
        allowed: count <= config.limit,
        limit: config.limit,
        remaining: Math.max(0, config.limit - count),
        resetSeconds: ttl > 0 ? ttl : config.windowSeconds,
      }
    },
    fallback,
  )
}

type Vars = RequestVariables & AuthVariables

/**
 * Identifier default: `user:{id}` bila terautentikasi, selain itu `ip:{addr}`
 * (docs/02 § 4.5). Bucket tertentu menimpanya (mis. `auth-login` memakai
 * ip + email, `auth-otp` memakai nomor telepon).
 */
function defaultIdentifier(c: {
  get: (k: 'userId') => string | undefined
  req: { header: (n: string) => string | undefined }
}): string {
  const userId = c.get('userId')
  if (userId) return `user:${userId}`
  const ip =
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  return `ip:${ip}`
}

export interface RateLimitOptions {
  /** Timpa cara menyusun identifier untuk bucket ini. */
  identifier?: (c: Context<{ Variables: Vars }>) => Promise<string> | string
}

export function rateLimit(
  bucket: RateLimitBucket,
  options: RateLimitOptions = {},
): MiddlewareHandler<{ Variables: Vars }> {
  return async (c, next) => {
    // Dimatikan HANYA untuk test (docs/02 § 8.1 `RATE_LIMIT_ENABLED`).
    if (!env.RATE_LIMIT_ENABLED) return next()

    const identifier = options.identifier ? await options.identifier(c) : defaultIdentifier(c)

    const result = await consume(bucket, identifier)

    c.header(HEADER.RATELIMIT_LIMIT, String(result.limit))
    c.header(HEADER.RATELIMIT_REMAINING, String(result.remaining))
    c.header(HEADER.RATELIMIT_RESET, String(result.resetSeconds))

    if (!result.allowed) {
      c.header(HEADER.RETRY_AFTER, String(result.resetSeconds))
      logger.info({ bucket, identifier, request_id: c.get('requestId') }, 'rate limit terlampaui')
      throw err.rateLimited()
    }

    await next()
  }
}

/** Hanya untuk test: paksa script dimuat ulang. */
export function resetRateLimitScriptCache(): void {
  scriptSha = null
}
