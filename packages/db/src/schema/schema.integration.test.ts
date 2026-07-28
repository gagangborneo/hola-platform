/**
 * F0-31 🔴 — gerbang DoD: schema di database ≡ konstanta TypeScript.
 *
 * Ini lapis kedua penjaga drift enum (RK-0-04). Lapis pertama (F0-20) menjaga
 * `@hola/shared` cocok dengan docs/03 § 3. Lapis ini menjaga PostgreSQL cocok
 * dengan `@hola/shared` — menangkap kasus migration lupa dijalankan, enum
 * ditambah di kode tapi tidak di database, atau urutan nilainya bergeser.
 *
 * Tanpa test ini, drift baru terlihat sebagai `invalid input value for enum` di
 * runtime produksi.
 */
import { enumValues, PG_ENUMS } from '@hola/shared'
import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, type HolaDb } from '../client.ts'
import { uuidv7Timestamp } from '../uuid.ts'
import { ALL_SEQUENCES } from './sequences.ts'
import { addons } from './venue.ts'

let db: HolaDb
let close: () => Promise<void>

beforeAll(() => {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL wajib diisi')
  const created = createDb({ url, onlyOneConnection: true })
  db = created.db
  close = () => created.sql.end()
})

afterAll(async () => {
  await close()
})

async function pgEnumValues(): Promise<Map<string, string[]>> {
  const rows = await db.execute<{ enum_name: string; values: string[] }>(sql`
    SELECT t.typname AS enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public'
     GROUP BY t.typname
  `)
  return new Map(rows.map((r) => [r.enum_name, r.values]))
}

describe('F0-31 — enum PostgreSQL ≡ PG_ENUMS di @hola/shared', () => {
  it('jumlah tipe enum di database sama dengan di kode', async () => {
    const actual = await pgEnumValues()
    expect(actual.size).toBe(Object.keys(PG_ENUMS).length)
  })

  it('tidak ada enum di kode yang belum dibuat di database', async () => {
    const actual = await pgEnumValues()
    const missing = Object.keys(PG_ENUMS).filter((name) => !actual.has(name))
    expect(missing).toEqual([])
  })

  it('tidak ada enum di database yang tidak dikenal kode', async () => {
    const actual = await pgEnumValues()
    const extra = [...actual.keys()].filter((name) => !(name in PG_ENUMS))
    expect(extra).toEqual([])
  })

  it('nilai & urutan setiap enum identik', async () => {
    const actual = await pgEnumValues()
    const mismatched: string[] = []
    for (const [name, constant] of Object.entries(PG_ENUMS)) {
      const inDb = actual.get(name)
      const inCode = enumValues(constant)
      if (JSON.stringify(inDb) !== JSON.stringify(inCode)) {
        mismatched.push(`${name}: db=${JSON.stringify(inDb)} kode=${JSON.stringify(inCode)}`)
      }
    }
    expect(mismatched).toEqual([])
  })
})

describe('F0-31 — tabel fondasi Phase 0 (ROADMAP § 3.2)', () => {
  /** Persis daftar di ROADMAP § 3.2, kolom `packages/db`. */
  const EXPECTED_TABLES = [
    'addons',
    'app_settings',
    'audit_logs',
    'court_operating_hours',
    'courts',
    'customer_profiles',
    'idempotency_records',
    'media_files',
    'notification_templates',
    'notifications',
    'otp_challenges',
    'password_reset_tokens',
    'price_rules',
    'push_tokens',
    'refresh_tokens',
    'special_dates',
    'sports',
    'users',
    'venues',
  ]

  it('seluruh tabel fondasi ada, tidak kurang tidak lebih', async () => {
    const rows = await db.execute<{ table_name: string }>(sql`
      SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name
    `)
    expect(rows.map((r) => r.table_name)).toEqual(EXPECTED_TABLES)
  })

  it('6 sequence kode manusia ada (docs/03 § 2)', async () => {
    const rows = await db.execute<{ sequence_name: string }>(sql`
      SELECT sequence_name FROM information_schema.sequences
       WHERE sequence_schema = 'public' ORDER BY sequence_name
    `)
    expect(rows.map((r) => r.sequence_name)).toEqual([...ALL_SEQUENCES].sort())
  })
})

describe('F0-31 — constraint yang menjaga invariant (docs/03 § 18)', () => {
  const EXPECTED_CHECKS = [
    'ck_court_operating_hours_dow',
    'ck_court_operating_hours_range',
    'ck_courts_slot_duration', // C-24
    'ck_price_rules_scope',
    'ck_price_rules_specific_date',
    'ck_price_rules_time_range',
    'ck_users_identifier',
  ]

  const EXPECTED_UNIQUE_INDEXES = [
    'uq_court_operating_hours_court_day',
    'uq_idempotency_records_key', // C-22
    'uq_media_files_object_key',
    'uq_notifications_dedupe_email', // C-19
    'uq_notifications_dedupe_user', // C-19
    'uq_password_reset_tokens_hash',
    'uq_push_tokens_expo_token',
    'uq_refresh_tokens_token_hash', // C-23
    'uq_users_email_lower',
    'uq_users_phone',
  ]

  it.each(EXPECTED_CHECKS)('CHECK %s ada', async (name) => {
    const rows = await db.execute<{ conname: string }>(
      sql`SELECT conname FROM pg_constraint WHERE conname = ${name}`,
    )
    expect(rows).toHaveLength(1)
  })

  it.each(EXPECTED_UNIQUE_INDEXES)('index unik %s ada', async (name) => {
    const rows = await db.execute<{ indexname: string }>(
      sql`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ${name}`,
    )
    expect(rows).toHaveLength(1)
  })

  it('C-22 idempotency_records.key benar-benar menolak duplikat', async () => {
    const key = `probe-${Date.now()}`
    const insert = (k: string) =>
      db.execute(sql`
      INSERT INTO idempotency_records (id, key, scope, request_hash, expires_at)
      VALUES (gen_random_uuid(), ${k}, 'probe', 'h', now() + interval '1 hour')
    `)
    await insert(key)
    await expect(insert(key)).rejects.toThrow()
    await db.execute(sql`DELETE FROM idempotency_records WHERE key = ${key}`)
  })

  it('ck_users_identifier menolak user tanpa email DAN tanpa phone', async () => {
    await expect(
      db.execute(sql`
        INSERT INTO users (id, role, full_name) VALUES (gen_random_uuid(), 'customer', 'Tanpa Identitas')
      `),
    ).rejects.toThrow()
  })

  it('uq_users_email_lower memperlakukan email beda kapital sebagai sama', async () => {
    const local = `probe-${Date.now()}`
    const insert = (email: string) =>
      db.execute(sql`
      INSERT INTO users (id, role, email, full_name)
      VALUES (gen_random_uuid(), 'customer', ${email}, 'Probe')
    `)
    await insert(`${local}@hola.test`)
    await expect(insert(`${local.toUpperCase()}@HOLA.TEST`)).rejects.toThrow()
    await db.execute(sql`DELETE FROM users WHERE lower(email) = ${`${local}@hola.test`}`)
  })

  it('C-24 menolak slot_duration_minutes di luar {30,60,90,120}', async () => {
    await expect(
      db.execute(sql`
        INSERT INTO courts (id, venue_id, sport_id, code, name, slot_duration_minutes)
        VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 'PROBE', 'Probe', 45)
      `),
    ).rejects.toThrow()
  })
})

describe('F0-31 — uang dipetakan bigint → number (docs/16 BR-TS-07)', () => {
  it('kolom uang dibaca sebagai number, bukan string', async () => {
    const code = `PROBE-${Date.now()}`
    await db.insert(addons).values({ code, name: 'Probe', priceAmount: 150_000 })
    const [row] = await db.select().from(addons).where(eq(addons.code, code))
    await db.delete(addons).where(eq(addons.code, code))

    // Default Drizzle mengembalikan bigint sebagai STRING. Kalau `mode: 'number'`
    // di columns.ts hilang, baris berikut gagal — dan tanpa test ini bug-nya
    // baru terlihat sebagai harga "15000025000" di layar checkout.
    expect(typeof row?.priceAmount).toBe('number')
    expect(row?.priceAmount).toBe(150_000)
    expect((row?.priceAmount ?? 0) + 25_000).toBe(175_000)
  })

  it('id yang dibuat aplikasi adalah UUID v7, bukan v4 (docs/03 § 2)', async () => {
    const code = `PROBE-${Date.now()}-v7`
    const [row] = await db
      .insert(addons)
      .values({ code, name: 'Probe', priceAmount: 0 })
      .returning()
    await db.delete(addons).where(eq(addons.code, code))

    // Digit ke-13 sebuah UUID adalah nomor versinya.
    expect(row?.id.charAt(14)).toBe('7')
    // Timestamp yang tertanam harus mendekati sekarang (toleransi 60 detik).
    expect(Math.abs(uuidv7Timestamp(row?.id ?? '') - Date.now())).toBeLessThan(60_000)
  })
})
