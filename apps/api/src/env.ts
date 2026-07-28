/**
 * Validasi environment saat boot.
 *
 * GAGAL KERAS di sini, bukan saat request pertama (docs/02-INFRASTRUCTURE.md
 * § 8). Alasannya operasional: container yang salah konfigurasi harus mati
 * segera supaya deploy gagal dan versi lama tetap melayani — bukan naik lalu
 * melempar 500 pada customer pertama yang mencoba membayar.
 *
 * Ini SATU-SATUNYA tempat `process.env` dibaca di apps/api. Modul lain menerima
 * hasilnya lewat parameter.
 */
import { apiEnvSchema } from '@hola/shared/env/index'

const parsed = apiEnvSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
  // Sengaja `process.stderr`, bukan logger: logger sendiri butuh env yang
  // barusan gagal divalidasi.
  process.stderr.write(`\nKonfigurasi environment tidak valid:\n${issues}\n\n`)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env

export const isProduction = env.APP_ENV === 'prod'
export const isLocal = env.APP_ENV === 'local'
