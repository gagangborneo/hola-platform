import { appSettings, bookingAddons, bookingItems, bookings, type HolaDb, users } from '@hola/db'
import { type Quote, type QuoteLine, SETTINGS_KEY } from '@hola/shared'
import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, or, type SQL, sql } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'
import type { BookingsQuery, MyBookingsQuery } from './bookings.schema.ts'

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
      createdAt: input.now,
      updatedAt: input.now,
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

export async function findBookingWithItems(
  db: DbExecutor,
  bookingId: string,
): Promise<{ booking: BookingRow; items: BookingItemRow[] } | null> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1)
  if (!booking) return null
  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId))
  return { booking, items }
}

export async function markBookingCheckedIn(
  tx: Tx,
  input: { bookingId: string; now: Date },
): Promise<BookingRow | null> {
  const [booking] = await tx
    .update(bookings)
    .set({ checkedInAt: input.now, updatedAt: input.now })
    .where(and(eq(bookings.id, input.bookingId), eq(bookings.status, 'confirmed')))
    .returning()
  return booking ?? null
}

export async function markBookingNoShow(
  tx: Tx,
  input: { bookingId: string; now: Date },
): Promise<BookingRow | null> {
  const [booking] = await tx
    .update(bookings)
    .set({ status: 'no_show', updatedAt: input.now })
    .where(and(eq(bookings.id, input.bookingId), eq(bookings.status, 'confirmed')))
    .returning()
  return booking ?? null
}

export async function patchBookingNotes(
  tx: Tx,
  input: {
    bookingId: string
    customerNote?: string | undefined
    internalNote?: string | undefined
    now: Date
  },
): Promise<BookingRow | null> {
  const [booking] = await tx
    .update(bookings)
    .set({
      ...(input.customerNote !== undefined ? { customerNote: input.customerNote } : {}),
      ...(input.internalNote !== undefined ? { internalNote: input.internalNote } : {}),
      updatedAt: input.now,
    })
    .where(eq(bookings.id, input.bookingId))
    .returning()
  return booking ?? null
}

function bookingListWhere(query: BookingsQuery): SQL | undefined {
  const search = query.q
    ? or(
        ilike(bookings.bookingCode, `%${query.q}%`),
        ilike(bookings.guestName, `%${query.q}%`),
        ilike(bookings.guestPhone, `%${query.q}%`),
        ilike(users.fullName, `%${query.q}%`),
        ilike(users.phone, `%${query.q}%`),
      )
    : undefined
  return and(
    ...(query.status ? [eq(bookings.status, query.status)] : []),
    ...(query.booking_date_from ? [gte(bookings.bookingDate, query.booking_date_from)] : []),
    ...(query.booking_date_to ? [lte(bookings.bookingDate, query.booking_date_to)] : []),
    ...(query.customer_user_id ? [eq(bookings.customerUserId, query.customer_user_id)] : []),
    ...(query.channel ? [eq(bookings.channel, query.channel)] : []),
    ...(query.court_id
      ? [
          sql`EXISTS (SELECT 1 FROM ${bookingItems} bi WHERE bi.booking_id = ${bookings.id} AND bi.court_id = ${query.court_id})`,
        ]
      : []),
    ...(search ? [search] : []),
  )
}

export async function listBookings(db: HolaDb, query: BookingsQuery): Promise<BookingRow[]> {
  const order = query.sort === 'booking_date' ? asc(bookings.bookingDate) : desc(bookings.createdAt)
  return db
    .select({ booking: bookings })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.customerUserId))
    .where(bookingListWhere(query))
    .orderBy(order, desc(bookings.id))
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
    .then((rows) => rows.map((row) => row.booking))
}

export async function countBookings(db: HolaDb, query: BookingsQuery): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .leftJoin(users, eq(users.id, bookings.customerUserId))
    .where(bookingListWhere(query))
  return row?.count ?? 0
}

export async function listCustomerBookings(
  db: HolaDb,
  input: MyBookingsQuery & {
    customerUserId: string
    nowDate: string
    decodedCursor?: { createdAt: Date; id: string } | undefined
  },
): Promise<BookingRow[]> {
  const cursor = input.decodedCursor
    ? or(
        lt(bookings.createdAt, input.decodedCursor.createdAt),
        and(
          eq(bookings.createdAt, input.decodedCursor.createdAt),
          lt(bookings.id, input.decodedCursor.id),
        ),
      )
    : undefined
  return db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.customerUserId, input.customerUserId),
        ...(input.status ? [eq(bookings.status, input.status)] : []),
        ...(input.upcoming ? [gte(bookings.bookingDate, input.nowDate)] : []),
        ...(cursor ? [cursor] : []),
      ),
    )
    .orderBy(desc(bookings.createdAt), desc(bookings.id))
    .limit(input.limit + 1)
}

export async function cancelPendingBooking(
  tx: Tx,
  input: { bookingId: string; actorUserId: string; reason: string; now: Date },
): Promise<BookingRow | null> {
  const [booking] = await tx
    .update(bookings)
    .set({
      status: 'cancelled',
      holdExpiresAt: null,
      cancelledAt: input.now,
      cancelledByUserId: input.actorUserId,
      cancellationReason: input.reason,
      updatedAt: input.now,
    })
    .where(and(eq(bookings.id, input.bookingId), eq(bookings.status, 'pending_payment')))
    .returning()
  return booking ?? null
}
