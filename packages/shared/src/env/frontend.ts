/**
 * Schema env `apps/web`, `apps/admin`, `apps/mobile`.
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 8.2, § 8.3, § 8.4.
 *
 * Aturan yang ditegakkan di sini:
 *   - Variabel yang sampai ke browser WAJIB berprefiks `NEXT_PUBLIC_` (Next.js)
 *     atau `EXPO_PUBLIC_` (Expo). Apa pun yang rahasia tidak boleh memakainya.
 *   - `DATABASE_URL`, `REDIS_URL`, `JWT_*`, dan `MIDTRANS_SERVER_KEY` TIDAK
 *     PERNAH ada di app frontend. Test `env.test.ts` mengunci larangan ini.
 *   - `MIDTRANS_CLIENT_KEY` diambil runtime dari `GET /config/public`, bukan
 *     dari env frontend, supaya rotasi key tidak butuh rebuild.
 */
import { z } from 'zod'

const appEnv = z.enum(['local', 'staging', 'prod'])

/** docs/02 § 8.2 */
export const webEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_APP_ENV: appEnv,
  NEXT_PUBLIC_API_BASE_URL: z.url(),
  /** Fetch server-side di dalam jaringan Docker — tidak keluar-masuk proxy. */
  API_BASE_URL_INTERNAL: z.url().optional(),
  NEXT_PUBLIC_WEB_BASE_URL: z.url(),
  NEXT_PUBLIC_MEDIA_BASE_URL: z.url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  /** Build-time saja: upload source map. */
  SENTRY_AUTH_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
})
export type WebEnv = z.infer<typeof webEnvSchema>

/** docs/02 § 8.3 */
export const adminEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_APP_ENV: appEnv,
  NEXT_PUBLIC_API_BASE_URL: z.url(),
  API_BASE_URL_INTERNAL: z.url().optional(),
  NEXT_PUBLIC_ADMIN_BASE_URL: z.url(),
  NEXT_PUBLIC_MEDIA_BASE_URL: z.url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
})
export type AdminEnv = z.infer<typeof adminEnvSchema>

/**
 * docs/02 § 8.4. Rahasia build (kredensial store) hidup di EAS Secrets, bukan di
 * repo — karena itu `GOOGLE_SERVICES_JSON` / `APPLE_*` tidak ada di schema ini.
 */
export const mobileEnvSchema = z.object({
  EXPO_PUBLIC_APP_ENV: appEnv,
  EXPO_PUBLIC_API_BASE_URL: z.url(),
  EXPO_PUBLIC_MEDIA_BASE_URL: z.url(),
  EXPO_PUBLIC_WEB_BASE_URL: z.url(),
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
  EAS_PROJECT_ID: z.string().min(1),
  SENTRY_AUTH_TOKEN: z.string().optional(),
})
export type MobileEnv = z.infer<typeof mobileEnvSchema>
