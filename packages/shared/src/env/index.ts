/**
 * Registry schema env per app.
 *
 * Dipakai `pnpm check:env` (scripts/check-env.ts di root) untuk membandingkan
 * kunci di `apps/<app>/.env.example` dengan kunci di schema — ketidaksinkronan
 * membuat CI gagal (docs/02 § 8, DoD-0-04).
 */
import type { z } from 'zod'
import { apiEnvSchema } from './api.ts'
import { adminEnvSchema, mobileEnvSchema, webEnvSchema } from './frontend.ts'

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
