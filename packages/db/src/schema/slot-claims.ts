/**
 * Hub kepemilikan slot. Sumber kebenaran: docs/03-DATA-MODEL.md § 8.
 *
 * `event_id` dan `match_id` sengaja belum ada; lihat ROADMAP § 1.2 untuk
 * migrasi constraint bertahap pada Phase 2 dan Phase 4.
 */
import { sql } from 'drizzle-orm'
import { check, date, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { pkId, timestamps, tstz } from '../columns.ts'
import { bookingItems } from './bookings.ts'
import { courtMaintenances } from './court-maintenance.ts'
import { claimStatusEnum, claimTypeEnum } from './enums.ts'
import { users } from './identity.ts'
import { courts } from './venue.ts'

export const slotClaims = pgTable(
  'slot_claims',
  {
    id: pkId(),
    courtId: uuid('court_id')
      .notNull()
      .references(() => courts.id),
    startsAt: tstz('starts_at').notNull(),
    endsAt: tstz('ends_at').notNull(),
    slotDate: date('slot_date').notNull(),
    claimType: claimTypeEnum('claim_type').notNull(),
    status: claimStatusEnum('status').notNull(),
    holdExpiresAt: tstz('hold_expires_at'),
    bookingItemId: uuid('booking_item_id').references(() => bookingItems.id),
    courtMaintenanceId: uuid('court_maintenance_id').references(() => courtMaintenances.id),
    releasedAt: tstz('released_at'),
    releaseReason: text('release_reason'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [
    // C-2, versi Phase 1. Owner event/match ditambahkan bersama tabelnya.
    check(
      'ck_slot_claims_single_owner',
      sql`((${t.bookingItemId} IS NOT NULL)::integer + (${t.courtMaintenanceId} IS NOT NULL)::integer) = 1`,
    ),
    check(
      'ck_slot_claims_owner_matches_type',
      sql`(${t.claimType} = 'booking' AND ${t.bookingItemId} IS NOT NULL) OR (${t.claimType} = 'maintenance' AND ${t.courtMaintenanceId} IS NOT NULL)`,
    ),
    // C-3 — hold tidak boleh hidup tanpa batas waktu.
    check(
      'ck_slot_claims_hold_expiry',
      sql`(${t.status} = 'held' AND ${t.holdExpiresAt} IS NOT NULL) OR (${t.status} <> 'held' AND ${t.holdExpiresAt} IS NULL)`,
    ),
    // C-4 — satu booking item tidak pernah memegang dua klaim.
    uniqueIndex('uq_slot_claims_booking_item')
      .on(t.bookingItemId)
      .where(sql`${t.bookingItemId} IS NOT NULL`),
    // C-1 — penjaga final anti double-booking.
    uniqueIndex('uq_slot_claims_active')
      .on(t.courtId, t.startsAt)
      .where(sql`${t.status} IN ('held', 'confirmed')`),
    index('idx_slot_claims_court_date')
      .on(t.courtId, t.slotDate)
      .where(sql`${t.status} IN ('held', 'confirmed')`),
    index('idx_slot_claims_expiring_holds').on(t.holdExpiresAt).where(sql`${t.status} = 'held'`),
  ],
)
