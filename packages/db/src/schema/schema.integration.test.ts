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
import { uuidv7, uuidv7Timestamp } from '../uuid.ts'
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

describe('F0-31 + P1.A — tabel schema yang sudah dijadwalkan', () => {
  /** Persis tabel Foundation + P1.A yang sudah menjadi migration. */
  const EXPECTED_TABLES = [
    'addons',
    'app_settings',
    'audit_logs',
    'booking_addons',
    'booking_items',
    'bookings',
    'court_maintenances',
    'court_operating_hours',
    'courts',
    'customer_profiles',
    'finance_events',
    'idempotency_records',
    'media_files',
    'notification_templates',
    'notifications',
    'otp_challenges',
    'password_reset_tokens',
    'payment_webhook_events',
    'payments',
    'price_rules',
    'promo_courts',
    'promo_redemptions',
    'promo_sports',
    'promos',
    'push_tokens',
    'refresh_tokens',
    'refunds',
    'slot_claims',
    'special_dates',
    'sports',
    'users',
    'venues',
  ]

  it('seluruh tabel yang dijadwalkan ada, tidak kurang tidak lebih', async () => {
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
    'ck_bookings_customer_or_guest',
    'ck_court_operating_hours_dow',
    'ck_court_operating_hours_range',
    'ck_courts_slot_duration', // C-24
    'ck_payments_single_payable', // C-5
    'ck_price_rules_scope',
    'ck_price_rules_specific_date',
    'ck_price_rules_time_range',
    'ck_promo_redemptions_single_target',
    'ck_promos_code_or_auto',
    'ck_promos_validity',
    'ck_promos_value',
    'ck_refunds_amount_positive',
    'ck_slot_claims_hold_expiry', // C-3
    'ck_slot_claims_owner_matches_type', // C-2
    'ck_slot_claims_single_owner', // C-2
    'ck_users_identifier',
  ]

  const EXPECTED_UNIQUE_INDEXES = [
    'uq_booking_addons_booking_addon',
    'uq_booking_items_booking_court_starts',
    'uq_bookings_booking_code',
    'uq_court_operating_hours_court_day',
    'uq_finance_events_source_kind',
    'uq_idempotency_records_key', // C-22
    'uq_media_files_object_key',
    'uq_notifications_dedupe_email', // C-19
    'uq_notifications_dedupe_user', // C-19
    'uq_password_reset_tokens_hash',
    'uq_payment_webhook_events_provider_event', // C-6
    'uq_payments_idempotency_key',
    'uq_payments_payment_code',
    'uq_payments_provider_order_id', // C-7
    'uq_push_tokens_expo_token',
    'uq_promo_redemptions_booking', // C-20
    'uq_promos_code',
    'uq_refresh_tokens_token_hash', // C-23
    'uq_refunds_refund_code',
    'uq_slot_claims_active', // C-1
    'uq_slot_claims_booking_item', // C-4
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

type SlotFixture = {
  bookingId: string
  bookingItemId: string
  courtId: string
}

async function createSlotFixture(): Promise<SlotFixture> {
  const userId = uuidv7()
  const venueId = uuidv7()
  const sportId = uuidv7()
  const courtId = uuidv7()
  const bookingId = uuidv7()
  const bookingItemId = uuidv7()
  const suffix = bookingId.slice(-12)

  await db.execute(sql`
    INSERT INTO users (id, role, email, full_name)
    VALUES (${userId}, 'customer', ${`schema-${suffix}@hola.test`}, 'Schema fixture')
  `)
  await db.execute(sql`INSERT INTO venues (id, name) VALUES (${venueId}, ${`Venue ${suffix}`})`)
  await db.execute(sql`
    INSERT INTO sports (id, code, name) VALUES (${sportId}, ${`S${suffix}`}, 'Schema sport')
  `)
  await db.execute(sql`
    INSERT INTO courts (id, venue_id, sport_id, code, name)
    VALUES (${courtId}, ${venueId}, ${sportId}, ${`C${suffix}`}, 'Schema court')
  `)
  await db.execute(sql`
    INSERT INTO bookings (
      id, booking_code, customer_user_id, channel, status, booking_date, slot_count,
      quote_snapshot, subtotal_amount, total_amount
    ) VALUES (
      ${bookingId}, ${`HB-${suffix}`}, ${userId}, 'web', 'pending_payment', '2026-08-01', 1,
      '{}'::jsonb, 100000, 100000
    )
  `)
  await db.execute(sql`
    INSERT INTO booking_items (
      id, booking_id, court_id, starts_at, ends_at, rate_class, unit_price_amount, line_total_amount
    ) VALUES (
      ${bookingItemId}, ${bookingId}, ${courtId}, '2026-08-01T01:00:00Z',
      '2026-08-01T02:00:00Z', 'offpeak', 100000, 100000
    )
  `)

  return { bookingId, bookingItemId, courtId }
}

async function createBookingItem(
  courtId: string,
): Promise<{ bookingId: string; bookingItemId: string }> {
  const userId = uuidv7()
  const bookingId = uuidv7()
  const bookingItemId = uuidv7()
  const suffix = bookingId.slice(-12)

  await db.execute(sql`
    INSERT INTO users (id, role, email, full_name)
    VALUES (${userId}, 'customer', ${`schema-${suffix}@hola.test`}, 'Schema fixture')
  `)
  await db.execute(sql`
    INSERT INTO bookings (
      id, booking_code, customer_user_id, channel, status, booking_date, slot_count,
      quote_snapshot, subtotal_amount, total_amount
    ) VALUES (
      ${bookingId}, ${`HB-${suffix}`}, ${userId}, 'web', 'pending_payment', '2026-08-01', 1,
      '{}'::jsonb, 100000, 100000
    )
  `)
  await db.execute(sql`
    INSERT INTO booking_items (
      id, booking_id, court_id, starts_at, ends_at, rate_class, unit_price_amount, line_total_amount
    ) VALUES (
      ${bookingItemId}, ${bookingId}, ${courtId}, '2026-08-01T01:00:00Z',
      '2026-08-01T02:00:00Z', 'offpeak', 100000, 100000
    )
  `)

  return { bookingId, bookingItemId }
}

async function createPayment(bookingId: string, providerOrderId: string): Promise<string> {
  const paymentId = uuidv7()
  const suffix = paymentId.slice(-12)
  await db.execute(sql`
    INSERT INTO payments (id, payment_code, provider, booking_id, amount, status, provider_order_id)
    VALUES (${paymentId}, ${`HP-${suffix}`}, 'midtrans', ${bookingId}, 100000, 'pending', ${providerOrderId})
  `)
  return paymentId
}

describe('P1.A — invariant constraint transaksional', () => {
  it('C-1 menolak dua slot claim aktif untuk court dan starts_at yang sama', async () => {
    const fixture = await createSlotFixture()
    await db.execute(sql`
      INSERT INTO slot_claims (
        id, court_id, starts_at, ends_at, slot_date, claim_type, status, hold_expires_at, booking_item_id
      ) VALUES (
        ${uuidv7()}, ${fixture.courtId}, '2026-08-01T01:00:00Z', '2026-08-01T02:00:00Z', '2026-08-01',
        'booking', 'held', '2026-08-01T01:10:00Z', ${fixture.bookingItemId}
      )
    `)
    const next = await createBookingItem(fixture.courtId)
    await expect(
      db.execute(sql`
        INSERT INTO slot_claims (
          id, court_id, starts_at, ends_at, slot_date, claim_type, status, hold_expires_at, booking_item_id
        ) VALUES (
          ${uuidv7()}, ${fixture.courtId}, '2026-08-01T01:00:00Z', '2026-08-01T02:00:00Z', '2026-08-01',
          'booking', 'held', '2026-08-01T01:10:00Z', ${next.bookingItemId}
        )
      `),
    ).rejects.toThrow()
  })

  it('C-2 dan C-3 menolak owner yang tidak cocok maupun held tanpa expiry', async () => {
    const fixture = await createSlotFixture()
    await expect(
      db.execute(sql`
        INSERT INTO slot_claims (id, court_id, starts_at, ends_at, slot_date, claim_type, status)
        VALUES (
          ${uuidv7()}, ${fixture.courtId}, '2026-08-01T03:00:00Z', '2026-08-01T04:00:00Z', '2026-08-01',
          'booking', 'confirmed'
        )
      `),
    ).rejects.toThrow()
    await expect(
      db.execute(sql`
        INSERT INTO slot_claims (
          id, court_id, starts_at, ends_at, slot_date, claim_type, status, booking_item_id
        ) VALUES (
          ${uuidv7()}, ${fixture.courtId}, '2026-08-01T04:00:00Z', '2026-08-01T05:00:00Z', '2026-08-01',
          'booking', 'held', ${fixture.bookingItemId}
        )
      `),
    ).rejects.toThrow()
  })

  it('C-4 menolak booking item yang memegang lebih dari satu claim', async () => {
    const fixture = await createSlotFixture()
    await db.execute(sql`
      INSERT INTO slot_claims (
        id, court_id, starts_at, ends_at, slot_date, claim_type, status, booking_item_id
      ) VALUES (
        ${uuidv7()}, ${fixture.courtId}, '2026-08-01T05:00:00Z', '2026-08-01T06:00:00Z', '2026-08-01',
        'booking', 'released', ${fixture.bookingItemId}
      )
    `)
    await expect(
      db.execute(sql`
        INSERT INTO slot_claims (
          id, court_id, starts_at, ends_at, slot_date, claim_type, status, booking_item_id
        ) VALUES (
          ${uuidv7()}, ${fixture.courtId}, '2026-08-01T06:00:00Z', '2026-08-01T07:00:00Z', '2026-08-01',
          'booking', 'released', ${fixture.bookingItemId}
        )
      `),
    ).rejects.toThrow()
  })

  it('C-5, C-6, C-7, dan C-20 menegakkan payable, webhook, order, dan redemption unik', async () => {
    await expect(
      db.execute(sql`
        INSERT INTO payments (id, payment_code, provider, amount, status)
        VALUES (${uuidv7()}, ${`HP-${uuidv7().slice(-12)}`}, 'manual', 100000, 'pending')
      `),
    ).rejects.toThrow()

    const fixture = await createSlotFixture()
    const providerOrderId = `order-${uuidv7()}`
    const providerEventId = `webhook-${uuidv7()}`
    const paymentId = await createPayment(fixture.bookingId, providerOrderId)
    await expect(createPayment(fixture.bookingId, providerOrderId)).rejects.toThrow()

    await db.execute(sql`
      INSERT INTO payment_webhook_events (
        id, provider, provider_event_id, payment_id, is_signature_valid, payload, received_at
      ) VALUES (${uuidv7()}, 'midtrans', ${providerEventId}, ${paymentId}, true, '{}'::jsonb, now())
    `)
    await expect(
      db.execute(sql`
        INSERT INTO payment_webhook_events (
          id, provider, provider_event_id, payment_id, is_signature_valid, payload, received_at
        ) VALUES (${uuidv7()}, 'midtrans', ${providerEventId}, ${paymentId}, true, '{}'::jsonb, now())
      `),
    ).rejects.toThrow()

    const promoId = uuidv7()
    await db.execute(sql`
      INSERT INTO promos (
        id, code, name, type, value_percent, applies_to, valid_from, valid_until, status
      ) VALUES (
        ${promoId}, ${`PROMO-${promoId.slice(-12)}`}, 'Schema promo', 'percent', 10.00, 'booking',
        '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z', 'active'
      )
    `)
    await db.execute(sql`
      INSERT INTO promo_redemptions (id, promo_id, booking_id, discount_amount, status, reserved_until)
      VALUES (${uuidv7()}, ${promoId}, ${fixture.bookingId}, 10000, 'reserved', '2026-08-01T01:10:00Z')
    `)
    await expect(
      db.execute(sql`
        INSERT INTO promo_redemptions (id, promo_id, booking_id, discount_amount, status, reserved_until)
        VALUES (${uuidv7()}, ${promoId}, ${fixture.bookingId}, 10000, 'reserved', '2026-08-01T01:10:00Z')
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
