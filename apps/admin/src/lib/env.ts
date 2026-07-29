import { type AdminEnv, adminEnvSchema } from '@hola/shared/env/index'

type EnvInput = Record<string, string | undefined>

/** Memvalidasi kontrak environment admin saat aplikasi dimuat. */
export function readAdminEnv(input: EnvInput): AdminEnv {
  return adminEnvSchema.parse(input)
}

export const env = readAdminEnv(process.env)
