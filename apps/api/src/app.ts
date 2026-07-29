/**
 * Komposisi aplikasi Hono.
 * Sumber kebenaran: docs/16-CONVENTIONS.md § 4.2, § 5.1.
 *
 * Mengekspor `AppType` untuk `packages/api-client` (BR-SV-05) — route baru
 * otomatis bertipe di client tanpa langkah tambahan.
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { env } from './env.ts'
import { type CoreDependencyVariables, coreDependencies } from './middleware/core-dependencies.ts'
import { errorHandler, notFoundHandler } from './middleware/error-handler.ts'
import { type AuthVariables, requestLogger } from './middleware/logger.ts'
import { type RequestVariables, requestId } from './middleware/request-id.ts'
import { assertRouteGuards } from './middleware/require-role.ts'
import { adminUsersRoutes } from './modules/admin/admin-users.routes.ts'
import { authRoutes } from './modules/auth/auth.routes.ts'
import { mediaRoutes } from './modules/media/media.routes.ts'
import { notificationRoutes } from './modules/notifications/notification.routes.ts'
import { configRoutes } from './modules/system/config.routes.ts'
import { healthRoutes } from './modules/system/health.routes.ts'

export type Variables = RequestVariables & AuthVariables & CoreDependencyVariables

/**
 * Allowlist route publik — route yang SENGAJA tanpa `requireRole()`.
 *
 * BR-SV-03: route tanpa guard DAN tanpa entri di sini membuat aplikasi GAGAL
 * SAAT BOOT. Daftar ini karena itu bukan kenyamanan, melainkan pernyataan
 * eksplisit "endpoint ini memang publik" yang harus ditinjau saat review.
 *
 * Guard-nya sendiri (`requireRole`) datang di F0-51 bersama modul auth; daftar
 * ini sudah berdiri sekarang agar route Phase 0 tercatat sejak awal.
 */
export const PUBLIC_ROUTE_ALLOWLIST: ReadonlySet<string> = new Set([
  'GET /healthz',
  'GET /readyz',
  'GET /healthz/worker',
  'GET /internal/metrics', // dijaga X-Internal-Token, bukan RBAC
  'GET /api/v1/config/public',
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh',
  'POST /api/v1/auth/otp/request',
  'POST /api/v1/auth/otp/verify',
  'POST /api/v1/auth/password/forgot',
  'POST /api/v1/auth/password/reset',
  'POST /api/v1/auth/email/verify',
])

const API_PREFIX = '/api/v1'

export function createApp() {
  const app = new Hono<{ Variables: Variables }>()

  app.onError(errorHandler)
  app.notFound(notFoundHandler)

  app.use('*', requestId)
  app.use('*', requestLogger)
  app.use('*', coreDependencies)
  app.use(
    '*',
    secureHeaders({
      // API tidak merender HTML; CSP ketat menutup kelas serangan yang tidak
      // relevan tapi juga tidak merugikan.
      contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      xFrameOptions: 'DENY',
      referrerPolicy: 'no-referrer',
    }),
  )
  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'Idempotency-Key',
        'X-Request-Id',
        'If-Match',
      ],
      exposeHeaders: [
        'X-Request-Id',
        'X-Cache',
        'X-Idempotent-Replay',
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
        'Retry-After',
      ],
      maxAge: 600,
    }),
  )

  // Health & metrik hidup DI LUAR prefiks versi: ia infrastruktur, bukan API
  // produk, dan URL-nya tidak boleh berubah saat versi API naik.
  const routes = app
    .route('/', healthRoutes)
    .route(API_PREFIX, configRoutes)
    .route(API_PREFIX, authRoutes)
    .route(API_PREFIX, adminUsersRoutes)
    .route(API_PREFIX, notificationRoutes)
    .route(API_PREFIX, mediaRoutes)

  assertRouteGuards(routes.routes, PUBLIC_ROUTE_ALLOWLIST)

  return routes
}

export const app = createApp()

/** Tipe route untuk `packages/api-client` (BR-SV-05, type-only import). */
export type AppType = typeof app
