/** Entitas booking. Sumber kebenaran: docs/03-DATA-MODEL.md § 7. */
import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { money, pkId, timestamps, tstz } from '../columns.ts'
import { bookingChannelEnum, bookingStatusEnum, rateClassEnum } from './enums.ts'
import { users } from './identity.ts'
import { promos } from './promos.ts'
import { addons, courts, priceRules } from './venue.ts'

export const bookings = pgTable(
  'bookings',
  {
    id: pkId(),
    bookingCode: text('booking_code').notNull(),
    customerUserId: uuid('customer_user_id').references(() => users.id),
    guestName: text('guest_name'),
    guestPhone: text('guest_phone'),
    channel: bookingChannelEnum('channel').notNull(),
    status: bookingStatusEnum('status').notNull(),
    bookingDate: date('booking_date').notNull(),
    slotCount: integer('slot_count').notNull(),
    quoteSnapshot: jsonb('quote_snapshot').notNull(),
    subtotalAmount: money('subtotal_amount').notNull(),
    addonAmount: money('addon_amount').notNull().default(0),
    discountAmount: money('discount_amount').notNull().default(0),
    taxAmount: money('tax_amount').notNull().default(0),
    feeAmount: money('fee_amount').notNull().default(0),
    totalAmount: money('total_amount').notNull(),
    promoId: uuid('promo_id').references(() => promos.id),
    promoCode: text('promo_code'),
    holdExpiresAt: tstz('hold_expires_at'),
    checkedInAt: tstz('checked_in_at'),
    confirmedAt: tstz('confirmed_at'),
    completedAt: tstz('completed_at'),
    cancelledAt: tstz('cancelled_at'),
    cancelledByUserId: uuid('cancelled_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    cancellationReason: text('cancellation_reason'),
    customerNote: text('customer_note'),
    internalNote: text('internal_note'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    rescheduleCount: integer('reschedule_count').notNull().default(0),
    rescheduleHistory: jsonb('reschedule_history').notNull().default([]),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_bookings_booking_code').on(t.bookingCode),
    check(
      'ck_bookings_customer_or_guest',
      sql`${t.customerUserId} IS NOT NULL OR (${t.guestName} IS NOT NULL AND ${t.guestPhone} IS NOT NULL)`,
    ),
    index('idx_bookings_customer_created').on(t.customerUserId, t.createdAt),
    index('idx_bookings_status_hold').on(t.status, t.holdExpiresAt),
    index('idx_bookings_date').on(t.bookingDate),
  ],
)

export const bookingItems = pgTable(
  'booking_items',
  {
    id: pkId(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    courtId: uuid('court_id')
      .notNull()
      .references(() => courts.id),
    startsAt: tstz('starts_at').notNull(),
    endsAt: tstz('ends_at').notNull(),
    rateClass: rateClassEnum('rate_class').notNull(),
    priceRuleId: uuid('price_rule_id').references(() => priceRules.id, { onDelete: 'set null' }),
    unitPriceAmount: money('unit_price_amount').notNull(),
    lineTotalAmount: money('line_total_amount').notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_booking_items_booking_court_starts').on(t.bookingId, t.courtId, t.startsAt),
    index('idx_booking_items_court_starts').on(t.courtId, t.startsAt),
  ],
)

export const bookingAddons = pgTable(
  'booking_addons',
  {
    id: pkId(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    addonId: uuid('addon_id')
      .notNull()
      .references(() => addons.id),
    quantity: integer('quantity').notNull(),
    unitPriceAmount: money('unit_price_amount').notNull(),
    lineTotalAmount: money('line_total_amount').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('uq_booking_addons_booking_addon').on(t.bookingId, t.addonId)],
)
