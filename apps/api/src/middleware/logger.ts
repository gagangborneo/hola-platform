/**
 * Log per request + metrik HTTP.
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 9.
 *
 * Field wajib: `request_id`, `method`, `path`, `status`, `duration_ms`,
 * `user_id`, `role`, `ip`.
 */

import type { UserRole } from '@hola/shared'
import type { MiddlewareHandler } from 'hono'
import { logger } from '../config/logger.ts'
import { incrementMetric, observeMetric } from '../config/metrics.ts'
import type { RequestVariables } from './request-id.ts'

export interface AuthVariables {
  userId?: string
  role?: UserRole
  cafeTenantId?: string
  employeeId?: string
  tokenJti?: string
  tokenIssuedAt?: Date
  tokenExpiresAt?: Date
  tokenVersion?: number
}

type Vars = RequestVariables & AuthVariables

function clientIp(c: {
  req: { header: (name: string) => string | undefined }
}): string | undefined {
  // Diset Traefik/Cloudflare di depan API (docs/02 § 4.5).
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip')
  )
}

export const requestLogger: MiddlewareHandler<{ Variables: Vars }> = async (c, next) => {
  const started = performance.now()
  await next()
  const durationMs = Math.round(performance.now() - started)

  // Pola route (`/bookings/:id`), bukan path konkret — kalau memakai path
  // konkret, kardinalitas label metrik meledak satu seri per booking.
  const route = c.req.routePath ?? c.req.path
  const status = c.res.status

  incrementMetric('http_requests_total', { route, status })
  observeMetric('http_request_duration_ms', durationMs, { route })

  logger.info(
    {
      request_id: c.get('requestId'),
      method: c.req.method,
      path: c.req.path,
      route,
      status,
      duration_ms: durationMs,
      user_id: c.get('userId'),
      role: c.get('role'),
      ip: clientIp(c),
    },
    'request',
  )
}
