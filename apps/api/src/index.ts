/**
 * Entry point HTTP.
 *
 * Proses ini BOLEH enqueue job, tetapi tidak memproses job — itu tugas
 * `worker.ts` di container terpisah (docs/01 § 3.1).
 */
import { serve } from '@hono/node-server'
import { app } from './app.ts'
import { closeDatabase } from './config/db.ts'
import { logger } from './config/logger.ts'
import { closeRedis } from './config/redis.ts'
import { closeSentry } from './config/sentry.ts'
import { env } from './env.ts'

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ port: info.port, app_env: env.APP_ENV }, 'hola-api siap')
})

/**
 * Graceful shutdown. Beri request yang sedang berjalan waktu menyelesaikan
 * sebelum menutup pool — kalau tidak, deploy akan memutus transaksi pembayaran
 * di tengah jalan.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutdown dimulai')
  server.close()
  await Promise.allSettled([closeDatabase(), closeRedis(), closeSentry()])
  logger.info('shutdown selesai')
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
