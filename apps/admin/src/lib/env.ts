import { type AdminEnv, adminEnvSchema } from '@hola/shared/env/index'

type EnvInput = Record<string, string | undefined>

/** Memvalidasi kontrak environment admin saat aplikasi dimuat. */
export function readAdminEnv(input: EnvInput): AdminEnv {
  return adminEnvSchema.parse(input)
}

/**
 * Kalau modul ini ikut terbundel ke klien: Next hanya menyulih
 * `process.env.NEXT_PUBLIC_X` secara statis kalau ekspresi member itu ditulis
 * literal — bukan saat seluruh objek `process.env` diteruskan begitu saja.
 * Kalau baris ini "disederhanakan" jadi `readAdminEnv(process.env)`, bundle
 * klien akan menerima `process.env` kosong dan `parse` di atas melempar
 * `ZodError` setiap kali halaman di-hydrate di browser — bug yang sama persis
 * yang ditemukan di `apps/web/src/lib/env.ts` (lihat `next.config.ts` untuk
 * pola literal yang sudah benar).
 */
export const env = readAdminEnv({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  API_BASE_URL_INTERNAL: process.env.API_BASE_URL_INTERNAL,
  NEXT_PUBLIC_ADMIN_BASE_URL: process.env.NEXT_PUBLIC_ADMIN_BASE_URL,
  NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
})
