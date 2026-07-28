/**
 * Koneksi Redis + `safeRedis`.
 * Sumber kebenaran: docs/16-CONVENTIONS.md § 7, docs/02-INFRASTRUCTURE.md § 4.
 *
 * DUA koneksi terpisah (BR-RD-01): BullMQ mensyaratkan
 * `maxRetriesPerRequest: null`, yang membuat perintah menggantung tanpa batas
 * saat Redis hilang. Kalau koneksi itu dipakai bersama cache/rate limit, satu
 * Redis hiccup akan menggantung request HTTP alih-alih fail-open.
 */
import { createRedisKeys } from '@hola/shared'
import { Redis } from 'ioredis'
import { env } from '../env.ts'
import { logger } from './logger.ts'
import { incrementMetric } from './metrics.ts'

/** Koneksi umum: cache, hold slot, rate limit, denylist, leaderboard. */
export const redis = new Redis(env.REDIS_URL, {
  // Gagal cepat, jangan menggantung request. Kegagalan ditangani safeRedis.
  maxRetriesPerRequest: 2,
  connectTimeout: 3000,
  commandTimeout: 2000,
  enableOfflineQueue: false,
  lazyConnect: false,
})

/** Koneksi khusus BullMQ. Jangan dipakai untuk apa pun selain queue. */
export const bullRedis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

for (const [name, conn] of [
  ['redis', redis],
  ['bullRedis', bullRedis],
] as const) {
  // `error` WAJIB punya listener — tanpa itu ioredis melempar unhandled error
  // dan mematikan proses saat Redis restart.
  conn.on('error', (err: Error) => logger.warn({ err, connection: name }, 'redis error'))
}

/** Builder key, sudah terikat ke APP_ENV. Jangan menyusun key manual (BR-RD-02). */
export const keys = createRedisKeys(env.APP_ENV)

/**
 * Satu-satunya jalur akses Redis (BR-RD-03, BR-RD-04 — tanpa pengecualian).
 *
 * Menangkap error, mencatat `warn`, menaikkan `redis_degraded_total{feature}`,
 * lalu mengembalikan `fallback`. Kegagalan Redis TIDAK BOLEH menggagalkan
 * request: rate limiter fail-open, cache jatuh ke PostgreSQL, hold slot tetap
 * benar karena dijaga partial unique index (RK-0-09, RK-1-02).
 *
 * @param feature label untuk metrik — pakai nama fitur, bukan nama perintah.
 */
export async function safeRedis<T>(feature: string, op: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await op()
  } catch (err) {
    incrementMetric('redis_degraded_total', { feature })
    logger.warn({ err, feature }, 'operasi redis gagal — memakai fallback')
    return fallback
  }
}

/** Ping untuk `/readyz`. Tidak melempar; mengembalikan status. */
export async function pingRedis(): Promise<boolean> {
  return safeRedis('healthcheck', async () => (await redis.ping()) === 'PONG', false)
}

export async function closeRedis(): Promise<void> {
  await Promise.allSettled([redis.quit(), bullRedis.quit()])
}
