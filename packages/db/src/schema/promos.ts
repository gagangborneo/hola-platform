/** Entitas promo. Sumber kebenaran: docs/03-DATA-MODEL.md § 10. */
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { money, pkId, timestamps, tstz } from '../columns.ts'
import { bookings } from './bookings.ts'
import {
  promoAppliesToEnum,
  promoRedemptionStatusEnum,
  promoStatusEnum,
  promoTypeEnum,
  rateClassEnum,
} from './enums.ts'
import { users } from './identity.ts'
import { courts, sports } from './venue.ts'

export const promos = pgTable(
  'promos',
  {
    id: pkId(),
    code: text('code'),
    name: text('name').notNull(),
    description: text('description'),
    type: promoTypeEnum('type').notNull(),
    valuePercent: numeric('value_percent', { precision: 5, scale: 2 }),
    valueAmount: money('value_amount'),
    freeSlotCount: integer('free_slot_count'),
    maxDiscountAmount: money('max_discount_amount'),
    minTransactionAmount: money('min_transaction_amount').notNull().default(0),
    minSlotCount: integer('min_slot_count'),
    appliesTo: promoAppliesToEnum('applies_to').notNull(),
    quotaTotal: integer('quota_total'),
    quotaUsed: integer('quota_used').notNull().default(0),
    quotaPerUser: integer('quota_per_user'),
    validFrom: tstz('valid_from').notNull(),
    validUntil: tstz('valid_until').notNull(),
    validDaysOfWeek: smallint('valid_days_of_week').array(),
    validStartsTime: time('valid_starts_time'),
    validEndsTime: time('valid_ends_time'),
    validRateClasses: rateClassEnum('valid_rate_classes').array(),
    isAuto: boolean('is_auto').notNull().default(false),
    // [D-02] default sementara — lihat docs/00-OVERVIEW.md § 6
    isStackable: boolean('is_stackable').notNull().default(false),
    priority: integer('priority').notNull().default(0),
    isNewCustomerOnly: boolean('is_new_customer_only').notNull().default(false),
    /** FK ke `tiers` ditambahkan bersama gamification pada Phase 3. */
    minTierCode: text('min_tier_code'),
    status: promoStatusEnum('status').notNull(),
    version: integer('version').notNull().default(1),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_promos_code').on(t.code),
    check(
      'ck_promos_value',
      sql`(
        ${t.type} = 'percent' AND ${t.valuePercent} IS NOT NULL AND ${t.valueAmount} IS NULL AND ${t.freeSlotCount} IS NULL
      ) OR (
        ${t.type} = 'fixed' AND ${t.valuePercent} IS NULL AND ${t.valueAmount} IS NOT NULL AND ${t.freeSlotCount} IS NULL
      ) OR (
        ${t.type} = 'free_slot' AND ${t.valuePercent} IS NULL AND ${t.valueAmount} IS NULL AND ${t.freeSlotCount} IS NOT NULL
      )`,
    ),
    check(
      'ck_promos_code_or_auto',
      sql`(${t.code} IS NOT NULL AND ${t.isAuto} = false) OR (${t.code} IS NULL AND ${t.isAuto} = true)`,
    ),
    check('ck_promos_validity', sql`${t.validFrom} < ${t.validUntil}`),
    index('idx_promos_status_validity').on(t.status, t.validFrom, t.validUntil),
  ],
)

/** Pembatas promo ke court tertentu. Tidak ada baris berarti tidak dibatasi court. */
export const promoCourts = pgTable(
  'promo_courts',
  {
    promoId: uuid('promo_id')
      .notNull()
      .references(() => promos.id),
    courtId: uuid('court_id')
      .notNull()
      .references(() => courts.id),
  },
  (t) => [primaryKey({ columns: [t.promoId, t.courtId], name: 'promo_courts_pkey' })],
)

/** Pembatas promo ke sport tertentu. Tidak ada baris berarti tidak dibatasi sport. */
export const promoSports = pgTable(
  'promo_sports',
  {
    promoId: uuid('promo_id')
      .notNull()
      .references(() => promos.id),
    sportId: uuid('sport_id')
      .notNull()
      .references(() => sports.id),
  },
  (t) => [primaryKey({ columns: [t.promoId, t.sportId], name: 'promo_sports_pkey' })],
)

/**
 * Reservasi dan penerapan kuota promo. FK event/tournament menyusul bersama
 * tabel targetnya; booking sudah tersedia di Phase 1.
 */
export const promoRedemptions = pgTable(
  'promo_redemptions',
  {
    id: pkId(),
    promoId: uuid('promo_id')
      .notNull()
      .references(() => promos.id),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    bookingId: uuid('booking_id').references(() => bookings.id),
    eventRegistrationId: uuid('event_registration_id'),
    tournamentRegistrationId: uuid('tournament_registration_id'),
    discountAmount: money('discount_amount').notNull(),
    status: promoRedemptionStatusEnum('status').notNull(),
    reservedUntil: tstz('reserved_until'),
    appliedAt: tstz('applied_at'),
    releasedAt: tstz('released_at'),
    releaseReason: text('release_reason'),
    ...timestamps,
  },
  (t) => [
    check(
      'ck_promo_redemptions_single_target',
      sql`((${t.bookingId} IS NOT NULL)::integer + (${t.eventRegistrationId} IS NOT NULL)::integer + (${t.tournamentRegistrationId} IS NOT NULL)::integer) = 1`,
    ),
    uniqueIndex('uq_promo_redemptions_booking')
      .on(t.promoId, t.bookingId)
      .where(sql`${t.bookingId} IS NOT NULL`),
    index('idx_promo_redemptions_promo_user').on(t.promoId, t.userId),
  ],
)
