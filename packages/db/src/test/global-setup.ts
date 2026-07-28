/**
 * Menjalankan migration sekali sebelum suite integrasi (docs/16 BR-TT-05).
 *
 * Database uji TERPISAH dari database dev: `hola_test`, dibuat otomatis oleh
 * docker/postgres/init/01-create-test-db.sql saat volume pertama kali dibuat.
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDb } from '../client.ts'

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL wajib diisi untuk test integrasi. Jalankan `pnpm dev:infra` lalu ' +
        'salin nilainya dari .env.example.',
    )
  }
  const { db, sql } = createDb({ url, onlyOneConnection: true })
  try {
    await migrate(db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname })
  } finally {
    await sql.end()
  }
}
