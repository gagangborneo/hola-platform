/**
 * Menjalankan migration forward-only.
 *
 * Dipanggil sebagai RELEASE STEP (`pnpm db:migrate`), sekali per deploy —
 * tidak pernah di `CMD` container. Kalau ia ada di CMD dan replica API > 1,
 * migration jalan dua kali dan schema rusak (docs/02 § 3 aturan 3, RK-0-08).
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDb } from './client.ts'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL wajib diisi')
  process.exit(1)
}

const { db, sql } = createDb({ url, onlyOneConnection: true })
const started = Date.now()
try {
  await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname })
  console.log(`migration selesai dalam ${Date.now() - started} ms`)
} finally {
  await sql.end()
}
