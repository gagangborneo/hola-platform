/**
 * Registry schema env per app.
 *
 * Dipakai `pnpm check:env` (scripts/check-env.ts di root) untuk membandingkan
 * kunci di `apps/<app>/.env.example` dengan kunci di schema — ketidaksinkronan
 * membuat CI gagal (docs/02 § 8, DoD-0-04).
 */
import { z } from 'zod'
import { apiEnvSchema } from './api.ts'
import { adminEnvSchema, mobileEnvSchema, webEnvSchema } from './frontend.ts'

/**
 * Zod v4 meng-JIT-compile schema (memakai `Function(...)`) secara default.
 * `apps/web/src/lib/env.ts` mem-parse schema ini di dalam bundle klien, dan
 * `script-src` produksi (`createSecurityHeaders`) tidak menyertakan
 * `'unsafe-eval'` — tanpa `jitless`, setiap hydrate memicu
 * `securitypolicyviolation` (Zod menangkap kegagalan JIT dan mendegradasi diam-
 * diam, jadi tidak ada yang rusak, tapi noise-nya menenggelamkan percobaan
 * injeksi sungguhan). Diset sekali di sini, secara global, supaya berlaku ke
 * seluruh schema `zod` di proses ini — termasuk yang didefinisikan di
 * `api.ts`/`frontend.ts` di atas, karena kompilasi JIT baru terjadi saat
 * `.parse()`/`.safeParse()` dipanggil, bukan saat schema didefinisikan.
 */
z.config({ jitless: true })

export { type ApiEnv, apiEnvSchema } from './api.ts'
export {
  type AdminEnv,
  adminEnvSchema,
  type MobileEnv,
  mobileEnvSchema,
  type WebEnv,
  webEnvSchema,
} from './frontend.ts'
export * from './shared.ts'

export const ENV_SCHEMAS = {
  api: apiEnvSchema,
  web: webEnvSchema,
  admin: adminEnvSchema,
  mobile: mobileEnvSchema,
} as const

export type EnvAppName = keyof typeof ENV_SCHEMAS

/**
 * Kunci teratas sebuah schema env, termasuk yang dibungkus `.superRefine()`
 * (`ZodEffects` menyembunyikan `.shape`, jadi harus di-unwrap dulu).
 */
export function envSchemaKeys(schema: z.ZodType): string[] {
  let current: unknown = schema
  // Turun lewat pembungkus effect/pipe sampai menemukan objek yang punya `shape`.
  for (let depth = 0; depth < 10; depth++) {
    const candidate = current as { shape?: Record<string, unknown>; _def?: { schema?: unknown } }
    if (candidate.shape) return Object.keys(candidate.shape)
    const inner = candidate._def?.schema
    if (inner === undefined) break
    current = inner
  }
  throw new Error('Schema env tidak berbentuk objek — tidak dapat mengambil daftar kuncinya')
}
