/**
 * Identitas build yang tampil di kaki sidebar.
 *
 * Dibaca lewat `process.env.NEXT_PUBLIC_*` literal — bukan lewat `env.ts` —
 * karena keduanya disuntikkan `next.config.ts` saat build dan bukan bagian dari
 * kontrak environment yang wajib ada. Aplikasi tetap harus jalan tanpa keduanya,
 * jadi nilainya punya fallback dan tidak divalidasi ketat.
 */
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'

/** SHA commit build; 7 karakter sudah cukup untuk mencocokkan dengan repositori. */
export const BUILD_SHA: string = (process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? 'development').slice(
  0,
  7,
)
