/**
 * Koneksi PostgreSQL.
 *
 * Satu instance Drizzle per proses (docs/16 § 4.2). Proses HTTP dan proses
 * worker punya pool masing-masing — mereka container terpisah dan di-scale
 * berbeda (docs/01 § 3.1).
 */
import { createDb } from '@hola/db'
import { sql } from 'drizzle-orm'
import { env } from '../env.ts'

const created = createDb({ url: env.DATABASE_URL, max: env.DATABASE_POOL_MAX })

export const db = created.db
export const pgClient = created.sql

/**
 * Cek kesehatan untuk `/readyz`.
 *
 * Berbeda dari Redis: PostgreSQL TIDAK punya fallback. Kalau ia mati, endpoint
 * yang butuh data mengembalikan `503` dan `/readyz` gagal (docs/02 § 12 E-2).
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`)
    return true
  } catch {
    return false
  }
}

export async function closeDatabase(): Promise<void> {
  await pgClient.end()
}
