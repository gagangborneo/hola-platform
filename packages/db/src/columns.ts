/**
 * Helper kolom standar.
 * Sumber kebenaran: docs/03-DATA-MODEL.md § 2.
 *
 * Ini BUKAN base class atau repository generik (dilarang docs/16 § 11 & AI-2) —
 * hanya pabrik definisi kolom, supaya konvensi `id` / `created_at` / uang tidak
 * ditulis ulang di 20 tabel dengan tipe yang sedikit berbeda-beda.
 */
import { bigint, timestamp, uuid } from 'drizzle-orm/pg-core'
import { uuidv7 } from './uuid.ts'

/**
 * PK uuid yang defaultnya dibuat APLIKASI sebagai UUID v7 (docs/03 § 2) —
 * bukan `gen_random_uuid()`.
 */
export const pkId = () => uuid('id').primaryKey().$defaultFn(uuidv7)

/** Kolom uuid biasa dengan default v7 (mis. `family_id` yang bukan PK). */
export const uuidV7Column = (name: string) => uuid(name).$defaultFn(uuidv7)

/**
 * Uang: `bigint` di PostgreSQL, `number` di TypeScript (docs/16 BR-TS-07).
 *
 * `mode: 'number'` penting. Default Drizzle mengembalikan `bigint` sebagai
 * **string**, yang akan menyelinap ke perhitungan sebagai konkatenasi
 * (`"150000" + 25000 === "15000025000"`) alih-alih penjumlahan. Nilai rupiah
 * realistis jauh di bawah 2^53, jadi integer JS aman.
 */
export const money = (name: string) => bigint(name, { mode: 'number' })

/** `timestamptz`, selalu disimpan UTC (docs/03 § 2, docs/16 BR-TS-08). */
export const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

/** Pasangan `created_at` / `updated_at` yang ada di hampir semua tabel. */
export const timestamps = {
  createdAt: tstz('created_at').notNull().defaultNow(),
  updatedAt: tstz('updated_at').notNull().defaultNow(),
}

/** Hanya `created_at` — untuk tabel append-only (`audit_logs`, `otp_challenges`). */
export const createdAtOnly = {
  createdAt: tstz('created_at').notNull().defaultNow(),
}
