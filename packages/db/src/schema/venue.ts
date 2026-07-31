/**
 * Entitas venue, court, dan pricing.
 * Sumber kebenaran: docs/03-DATA-MODEL.md § 6.
 */
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  time,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { money, pkId, timestamps } from '../columns.ts'
import { courtStatusEnum, dayTypeEnum, rateClassEnum } from './enums.ts'

/** Satu baris di v1. */
export const venues = pgTable('venues', {
  id: pkId(),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  timezone: text('timezone').notNull().default('Asia/Makassar'),
  defaultOpensTime: time('default_opens_time'),
  defaultClosesTime: time('default_closes_time'),
  phone: text('phone'),
  mapUrl: text('map_url'),
  ...timestamps,
})

export const sports = pgTable('sports', {
  id: pkId(),
  /** mis. `padel`. */
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  iconMediaId: uuid('icon_media_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

export const courts = pgTable(
  'courts',
  {
    id: pkId(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id),
    sportId: uuid('sport_id')
      .notNull()
      .references(() => sports.id),
    /** mis. `PDL-01`. Kode manual, huruf besar (docs/03 § 2). */
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    description: text('description'),
    /** mis. `artificial_grass`, `vinyl`. */
    surface: text('surface'),
    isIndoor: boolean('is_indoor').notNull().default(false),
    /**
     * Menentukan grid slot. TIDAK dapat diubah bila ada klaim mendatang
     * (S-4) — mengubahnya akan membuat seluruh `starts_at` lama tidak rata grid.
     */
    slotDurationMinutes: integer('slot_duration_minutes').notNull().default(60),
    minSlotsPerBooking: integer('min_slots_per_booking').notNull().default(1),
    maxSlotsPerBooking: integer('max_slots_per_booking').notNull().default(4),
    maxPlayers: integer('max_players'),
    status: courtStatusEnum('status').notNull().default('active'),
    /** Optimistic locking untuk PATCH admin (docs/04 § Optimistic locking). */
    version: integer('version').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    // C-24 — grid slot selalu terdefinisi.
    check('ck_courts_slot_duration', sql`${t.slotDurationMinutes} IN (30, 60, 90, 120)`),
    index('idx_courts_sport').on(t.sportId, t.sortOrder),
  ],
)

export const courtOperatingHours = pgTable(
  'court_operating_hours',
  {
    id: pkId(),
    courtId: uuid('court_id')
      .notNull()
      .references(() => courts.id, { onDelete: 'cascade' }),
    /** 0=Minggu … 6=Sabtu, mengikuti `EXTRACT(DOW)` PostgreSQL. */
    dayOfWeek: smallint('day_of_week').notNull(),
    opensTime: time('opens_time').notNull(),
    closesTime: time('closes_time').notNull(),
    ...timestamps,
  },
  (t) => [
    // Satu rentang per hari di v1. Rentang terpisah (tutup siang) TIDAK didukung —
    // pakai `court_maintenances` untuk penutupan berulang.
    uniqueIndex('uq_court_operating_hours_court_day').on(t.courtId, t.dayOfWeek),
    check('ck_court_operating_hours_dow', sql`${t.dayOfWeek} BETWEEN 0 AND 6`),
    check('ck_court_operating_hours_range', sql`${t.opensTime} < ${t.closesTime}`),
  ],
)

export const specialDates = pgTable('special_dates', {
  id: pkId(),
  date: date('date').notNull().unique(),
  name: text('name').notNull(),
  /** `holiday` | `weekend` | `weekday` — menimpa penentuan tipe hari di P2. */
  dayTypeOverride: dayTypeEnum('day_type_override'),
  /** Venue tutup total pada tanggal ini. */
  isClosed: boolean('is_closed').notNull().default(false),
  ...timestamps,
})

export const addons = pgTable('addons', {
  id: pkId(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  priceAmount: money('price_amount').notNull(),
  /** mis. `per_item`, `per_hour`. */
  unit: text('unit').notNull().default('per_item'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

/**
 * Aturan harga per jam. Resolusi memakai priority tertinggi yang cocok, dengan
 * tie-break 6 tingkat di docs/07 § 3.3 P2.
 *
 * Tidak ada harga default: slot tanpa rule yang cocok TIDAK DIJUAL
 * (`422 PRICE_RULE_NOT_FOUND`, RK-1-12).
 */
export const priceRules = pgTable(
  'price_rules',
  {
    id: pkId(),
    /** NULL = berlaku untuk semua court dalam `sport_id`. */
    courtId: uuid('court_id').references(() => courts.id, { onDelete: 'cascade' }),
    /** Wajib jika `court_id` NULL. */
    sportId: uuid('sport_id').references(() => sports.id, { onDelete: 'cascade' }),
    dayType: dayTypeEnum('day_type').notNull(),
    /** Wajib jika `day_type = 'specific_date'`. */
    specificDate: date('specific_date'),
    /** Inklusif. */
    startsTime: time('starts_time').notNull(),
    /** Eksklusif. */
    endsTime: time('ends_time').notNull(),
    rateClass: rateClassEnum('rate_class').notNull(),
    pricePerHourAmount: money('price_per_hour_amount').notNull(),
    /** Lebih besar menang. */
    priority: integer('priority').notNull().default(0),
    activeFrom: date('active_from'),
    activeTo: date('active_to'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    check('ck_price_rules_scope', sql`${t.courtId} IS NOT NULL OR ${t.sportId} IS NOT NULL`),
    check(
      'ck_price_rules_specific_date',
      sql`${t.dayType} <> 'specific_date' OR ${t.specificDate} IS NOT NULL`,
    ),
    check('ck_price_rules_time_range', sql`${t.startsTime} < ${t.endsTime}`),
    // P2 memilih rule dengan menyaring court/sport + day_type + rentang jam.
    index('idx_price_rules_lookup').on(t.courtId, t.sportId, t.dayType, t.isActive),
  ],
)
