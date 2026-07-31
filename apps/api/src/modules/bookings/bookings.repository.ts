import { appSettings, bookingAddons, bookingItems, bookings, type HolaDb } from '@hola/db'
import { type Quote, type QuoteLine, SETTINGS_KEY } from '@hola/shared'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'

type DbExecutor = HolaDb | Tx

export type BookingRow = typeof bookings.$inferSelect
export type BookingItemRow = typeof bookingItems.$inferSelect
export type PersistedSlotQuoteLine = QuoteLine & {
  type: 'slot'
  starts_at: string
  ends_at: string
  rate_class: NonNullable<QuoteLine['rate_class']>
}
export type PersistedAddonQuoteLine = QuoteLine & { type: 'addon' }

export type BookingSettings = {
  bookingHorizonDays: number
  maxConfirmedBookingsPerDay: number
  requireContiguousSlots: boolean
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback
}

export async function findBookingSettings(db: HolaDb): Promise<BookingSettings> {
  const rows = await db
    .select({ key: appSettings.key, value: appSettings.value })
    .from(appSettings)
    .where(
      inArray(appSettings.key, [
        SETTINGS_KEY.BOOKING_HORIZON_DAYS,
        SETTINGS_KEY.MAX_CONFIRMED_BOOKINGS_PER_DAY,
        SETTINGS_KEY.REQUIRE_CONTIGUOUS_SLOTS,
      ]),
    )
  const values = new Map(rows.map((row) => [row.key, row.value]))
  return {
    bookingHorizonDays: positiveInteger(values.get(SETTINGS_KEY.BOOKING_HORIZON_DAYS), 60),
    maxConfirmedBookingsPerDay: positiveInteger(
      values.get(SETTINGS_KEY.MAX_CONFIRMED_BOOKINGS_PER_DAY),
      2,
    ),
    requireContiguousSlots: values.get(SETTINGS_KEY.REQUIRE_CONTIGUOUS_SLOTS) === true,
  }
}

export async function countCustomerBookings(
  db: DbExecutor,
  input: { customerUserId: string; status: 'pending_payment' | 'confirmed'; bookingDate?: string },
): Promise<number> {
  const conditions = [
    eq(bookings.customerUserId, input.customerUserId),
    eq(bookings.status, input.status),
    ...(input.bookingDate ? [eq(bookings.bookingDate, input.bookingDate)] : []),
  ]
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(...conditions))
  return row?.count ?? 0
}

/** Serialisasi pemeriksaan limit per customer tanpa mengunci seluruh tabel. */
export async function lockCustomerBookingLimits(tx: Tx, customerUserId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${customerUserId}, 0))`)
}

export async function insertBooking(
  tx: Tx,
  input: {
    bookingCode: string
    customerUserId: string | null
    guestName: string | null
    guestPhone: string | null
    channel: 'web' | 'mobile' | 'admin' | 'walk_in'
    status: 'pending_payment' | 'confirmed'
    bookingDate: string
    slotCount: number
    quote: Quote
    holdExpiresAt: Date | null
    customerNote: string | null
    createdByUserId: string | null
    now: Date
  },
): Promise<BookingRow> {
  const [row] = await tx
    .insert(bookings)
    .values({
      bookingCode: input.bookingCode,
      customerUserId: input.customerUserId,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      channel: input.channel,
      status: input.status,
      bookingDate: input.bookingDate,
      slotCount: input.slotCount,
      quoteSnapshot: input.quote,
      subtotalAmount: input.quote.subtotal_amount,
      addonAmount: input.quote.addon_amount,
      discountAmount: input.quote.discount_amount,
      taxAmount: input.quote.tax_amount,
      feeAmount: input.quote.fee_amount,
      totalAmount: input.quote.total_amount,
      promoId: input.quote.promo?.promo_id ?? null,
      promoCode: input.quote.promo?.code ?? null,
      holdExpiresAt: input.holdExpiresAt,
      customerNote: input.customerNote,
      createdByUserId: input.createdByUserId,
      ...(input.status === 'confirmed' ? { confirmedAt: input.now } : {}),
      ...(input.channel === 'walk_in' ? { checkedInAt: input.now } : {}),
    })
    .returning()
  if (!row) throw new Error('INSERT bookings tidak mengembalikan baris')
  return row
}

export async function insertBookingItems(
  tx: Tx,
  input: {
    bookingId: string
    lines: ReadonlyArray<PersistedSlotQuoteLine>
  },
): Promise<BookingItemRow[]> {
  if (input.lines.length === 0) return []
  return tx
    .insert(bookingItems)
    .values(
      input.lines.map((line) => ({
        bookingId: input.bookingId,
        courtId: line.ref_id,
        startsAt: new Date(line.starts_at),
        endsAt: new Date(line.ends_at),
        rateClass: line.rate_class,
        priceRuleId: line.price_rule_id,
        unitPriceAmount: line.unit_price_amount,
        lineTotalAmount: line.line_total_amount,
      })),
    )
    .returning()
}

export async function insertBookingAddons(
  tx: Tx,
  input: { bookingId: string; lines: ReadonlyArray<PersistedAddonQuoteLine> },
): Promise<void> {
  if (input.lines.length === 0) return
  await tx.insert(bookingAddons).values(
    input.lines.map((line) => ({
      bookingId: input.bookingId,
      addonId: line.ref_id,
      quantity: line.quantity,
      unitPriceAmount: line.unit_price_amount,
      lineTotalAmount: line.line_total_amount,
    })),
  )
}
