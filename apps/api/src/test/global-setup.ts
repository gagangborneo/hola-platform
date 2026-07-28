import { createDb } from '@hola/db'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL wajib diisi untuk test integrasi. Jalankan `pnpm dev:infra` lalu ' +
        'gunakan database test terpisah.',
    )
  }

  const { db, sql } = createDb({ url, onlyOneConnection: true })
  try {
    const migrationsFolder = new URL('../../../../packages/db/drizzle', import.meta.url).pathname
    await migrate(db, { migrationsFolder })
  } finally {
    await sql.end()
  }
}
