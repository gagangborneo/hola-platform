/** Dashboard Bull Board terpisah, read-only, basic auth dan IP allowlist. */
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { HonoAdapter } from '@bull-board/hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import {
  bullboardRequestIp,
  isBullboardAuthorized,
  isBullboardIpAllowed,
} from './bullboard.security.ts'
import { logger } from './config/logger.ts'
import { closeQueues, queues } from './config/queues.ts'
import { closeRedis } from './config/redis.ts'
import { env } from './env.ts'

const PORT = 4100
const BASE_PATH = '/queues'

const serverAdapter = new HonoAdapter(serveStatic)
serverAdapter.setBasePath(BASE_PATH)
const boardQueues = Object.values(queues).map((queue) => {
  const adapter = new BullMQAdapter(queue, { readOnlyMode: true })
  // Meski payload job harus minimal, dashboard tidak pernah menampilkan payload.
  adapter.setFormatter('data', () => '[redacted]')
  adapter.setFormatter('returnValue', () => '[redacted]')
  return adapter
})
createBullBoard({ queues: boardQueues, serverAdapter })

const dashboard = new Hono()
dashboard.use('*', async (c, next) => {
  if (!isBullboardIpAllowed(bullboardRequestIp(c.req.raw.headers), env.BULLBOARD_ALLOWED_IPS)) {
    return c.text('Forbidden', 403)
  }
  if (
    !isBullboardAuthorized(
      c.req.header('authorization'),
      env.BULLBOARD_USER,
      env.BULLBOARD_PASSWORD,
    )
  ) {
    return c.text('Unauthorized', 401, { 'WWW-Authenticate': 'Basic realm="Hola Queue"' })
  }
  await next()
})
dashboard.route(BASE_PATH, serverAdapter.registerPlugin())

const server = serve({ fetch: dashboard.fetch, port: PORT }, () => {
  logger.info({ port: PORT }, 'bull-board siap')
})

let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, 'bull-board shutdown dimulai')
  server.close()
  await Promise.allSettled([closeQueues(), closeRedis()])
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
