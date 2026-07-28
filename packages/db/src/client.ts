/**
 * Koneksi Drizzle tunggal.
 *
 * Satu instance per proses (docs/16 § 4.2). apps/api membuatnya sekali di
 * `config/db.ts`; worker punya prosesnya sendiri, jadi pool-nya juga terpisah.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema/index.ts'

export interface CreateDbOptions {
  url: string
  /** Ukuran pool per proses (`DATABASE_POOL_MAX`, docs/02 § 8.1). */
  max?: number
  /** Jumlah koneksi untuk migration/skrip sekali jalan. */
  onlyOneConnection?: boolean
}

export function createDb(options: CreateDbOptions) {
  const sql = postgres(options.url, {
    max: options.onlyOneConnection ? 1 : (options.max ?? 10),
    // Nama aplikasi muncul di pg_stat_activity — memudahkan melacak koneksi
    // menggantung saat produksi bermasalah.
    connection: { application_name: 'hola' },
  })
  return { db: drizzle(sql, { schema }), sql }
}

export type HolaDb = ReturnType<typeof createDb>['db']
