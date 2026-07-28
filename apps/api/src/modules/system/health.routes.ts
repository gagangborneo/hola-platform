/**
 * Health, readiness, dan metrik.
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 2, § 9.
 *
 * Perbedaan yang penting antara keduanya:
 *   - `/healthz`  liveness. "Proses ini hidup?" Tidak menyentuh dependensi.
 *                 Kalau ia gagal, orchestrator harus me-restart container.
 *   - `/readyz`   readiness. "Boleh menerima traffic?" Mengecek PG + Redis.
 *
 * PostgreSQL mati → `503`, tanpa fallback (docs/02 § 12 E-2).
 * Redis mati → tetap `200` dengan `status: "degraded"` — API masih melayani
 * sepenuhnya karena semua pemakaian Redis fail-open (E-1, DoD-0-08).
 */
import { WORKER_HEARTBEAT_TTL_SECONDS } from '@hola/shared'
import { Hono } from 'hono'
import { pingDatabase } from '../../config/db.ts'
import { renderMetrics } from '../../config/metrics.ts'
import { keys, pingRedis, redis, safeRedis } from '../../config/redis.ts'
import { env } from '../../env.ts'
import { err } from '../../lib/errors.ts'
import { HEADER } from '../../lib/response.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'

const startedAt = Date.now()

export const healthRoutes = new Hono<{ Variables: RequestVariables }>()

  /** Liveness. Sengaja tidak menyentuh dependensi apa pun. */
  .get('/healthz', (c) =>
    c.json({
      status: 'ok',
      app_env: env.APP_ENV,
      uptime_seconds: Math.round((Date.now() - startedAt) / 1000),
    }),
  )

  /** Readiness. `degraded` saat Redis mati; `503` saat PostgreSQL mati. */
  .get('/readyz', async (c) => {
    const [database, redisUp] = await Promise.all([pingDatabase(), pingRedis()])

    const status = !database ? 'unavailable' : redisUp ? 'ok' : 'degraded'
    const body = {
      status,
      checks: {
        database: database ? 'ok' : 'down',
        redis: redisUp ? 'ok' : 'down',
      },
    }
    // PostgreSQL adalah satu-satunya dependensi yang membuat kita tidak siap.
    return c.json(body, database ? 200 : 503)
  })

  /**
   * Heartbeat worker. Worker menulis key ini tiap 30 detik dengan TTL 90 detik;
   * kalau ia basi, job terjadwal mungkin tertunda (warning `WORKER_DEGRADED`).
   *
   * Penjualan TIDAK berhenti saat worker mati (RK-1-09) — endpoint ini untuk
   * alerting, bukan gerbang traffic.
   */
  .get('/healthz/worker', async (c) => {
    const heartbeat = await safeRedis(
      'worker_heartbeat',
      () => redis.get(keys.workerHeartbeat()),
      null,
    )
    const alive = heartbeat !== null
    return c.json(
      {
        status: alive ? 'ok' : 'stale',
        last_heartbeat_at: heartbeat,
        grace_seconds: WORKER_HEARTBEAT_TTL_SECONDS,
      },
      alive ? 200 : 503,
    )
  })

  /**
   * Metrik teks Prometheus. Dilindungi `X-Internal-Token` — isinya membocorkan
   * bentuk traffic dan tidak boleh publik.
   */
  .get('/internal/metrics', (c) => {
    const token = c.req.header(HEADER.INTERNAL_TOKEN)
    if (!token || token !== env.INTERNAL_TOKEN) {
      throw err.forbidden('Token internal tidak valid.')
    }
    return c.text(renderMetrics(), 200, { 'Content-Type': 'text/plain; version=0.0.4' })
  })
