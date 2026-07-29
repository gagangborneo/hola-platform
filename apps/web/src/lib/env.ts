import { type WebEnv, webEnvSchema } from '@hola/shared/env/index'

type EnvInput = Record<string, string | undefined>

/** Memvalidasi kontrak environment web saat aplikasi dimuat. */
export function readWebEnv(input: EnvInput): WebEnv {
  return webEnvSchema.parse(input)
}

export const env = readWebEnv(process.env)
