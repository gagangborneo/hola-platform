import { defineConfig } from 'drizzle-kit'

// DATABASE_URL adalah satu-satunya env yang dibutuhkan tooling migration
// (docs/02-INFRASTRUCTURE.md § 8.5).
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL wajib diisi untuk drizzle-kit')

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  // Migration dijalankan sebagai release step, sekali per deploy — tidak pernah
  // di CMD container (docs/02 § 3 aturan 3, RK-0-08).
  strict: true,
  verbose: true,
})
