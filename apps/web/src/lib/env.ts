import { type WebEnv, webEnvSchema } from '@hola/shared/env/index'

type EnvInput = Record<string, string | undefined>

/** Memvalidasi kontrak environment web saat aplikasi dimuat. */
export function readWebEnv(input: EnvInput): WebEnv {
  return webEnvSchema.parse(input)
}

/**
 * Modul ini juga dibundel ke klien (dipakai lewat `auth.ts` di komponen
 * `'use client'`). Next hanya menyulih `process.env.NEXT_PUBLIC_X` secara
 * statis kalau ekspresi member itu ditulis literal — bukan saat seluruh objek
 * `process.env` diteruskan begitu saja. Kalau baris ini "disederhanakan" jadi
 * `readWebEnv(process.env)`, bundle klien akan menerima `process.env` kosong
 * dan `parse` di atas melempar `ZodError` setiap kali halaman di-hydrate di
 * browser (lihat `next.config.ts` — pola literal yang sama dipakai di sana).
 */
export const env = readWebEnv({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  API_BASE_URL_INTERNAL: process.env.API_BASE_URL_INTERNAL,
  NEXT_PUBLIC_WEB_BASE_URL: process.env.NEXT_PUBLIC_WEB_BASE_URL,
  NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
  NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
})
