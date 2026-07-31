import {
  areSlotsContiguous,
  ERROR_CODE,
  HOLD_SLOT_TTL_SECONDS,
  MAX_PENDING_PAYMENT_BOOKINGS_PER_CUSTOMER,
  type Quote,
  witaDateYmd,
} from '@hola/shared'
import { nextBookingCode } from '../../lib/codes.ts'
import { err } from '../../lib/errors.ts'
import { addSeconds } from '../../lib/time.ts'
import { withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { findPricingCourts } from '../pricing/pricing.repository.ts'
import { computeQuote } from '../pricing/pricing.service.ts'
import {
  claimBookingHoldSlotsInTransaction,
  releaseReservedHoldKeys,
  reserveBookingHoldKeys,
} from '../slots/slots.service.ts'
import {
  type BookingItemRow,
  type BookingRow,
  countCustomerBookings,
  findBookingSettings,
  findBookingWithItems,
  insertBooking,
  insertBookingAddons,
  insertBookingItems,
  lockCustomerBookingLimits,
  markBookingCheckedIn,
  markBookingNoShow,
  type PersistedAddonQuoteLine,
  type PersistedSlotQuoteLine,
} from './bookings.repository.ts'
import type { BookingQuoteInput, CreateBookingInput } from './bookings.schema.ts'

export type BookingsServiceContext = Pick<
  CoreDependencies,
  'db' | 'redis' | 'redisKeys' | 'safeRedis' | 'logger'
> & {
  now: Date
  actor: Viewer
  clientPlatform?: string | undefined
}

export type CreatedBooking = {
  booking: BookingRow
  items: BookingItemRow[]
  quote: Quote
}

function slotLines(quote: Quote): PersistedSlotQuoteLine[] {
  return quote.lines.filter(
    (line): line is PersistedSlotQuoteLine =>
      line.type === 'slot' &&
      typeof line.starts_at === 'string' &&
      typeof line.ends_at === 'string' &&
      line.rate_class !== undefined,
  )
}

function addonLines(quote: Quote): PersistedAddonQuoteLine[] {
  return quote.lines.filter((line): line is PersistedAddonQuoteLine => line.type === 'addon')
}

function bookingChannel(
  actor: Viewer,
  input: CreateBookingInput,
  platform: string | undefined,
): 'web' | 'mobile' | 'admin' | 'walk_in' {
  if (actor.role === 'customer') {
    return platform === 'mobile-ios' || platform === 'mobile-android' ? 'mobile' : 'web'
  }
  if (input.channel === 'walk_in') {
    throw err.featureDisabled('Booking walk-in menunggu pencatatan payment tunai di P1.H.')
  }
  return 'admin'
}

function addDays(instant: Date, days: number): Date {
  return new Date(instant.getTime() + days * 24 * 60 * 60 * 1_000)
}

function itemKey(courtId: string, startsAt: Date): string {
  return `${courtId}:${startsAt.toISOString()}`
}

function validateBookingShape(
  quote: Quote,
  courtDurations: ReadonlyMap<string, number>,
  input: { settings: Awaited<ReturnType<typeof findBookingSettings>>; now: Date; isStaff: boolean },
): string {
  const lines = slotLines(quote)
  const dates = new Set(lines.map((line) => witaDateYmd(new Date(line.starts_at))))
  if (dates.size !== 1) throw err.of(ERROR_CODE.MIXED_BOOKING_DATE)
  const bookingDate = [...dates][0]
  if (!bookingDate) throw err.validation({ field: 'items' })

  const byCourt = new Map<string, PersistedSlotQuoteLine[]>()
  for (const line of lines) {
    const existing = byCourt.get(line.ref_id) ?? []
    existing.push(line)
    byCourt.set(line.ref_id, existing)
    if (
      !input.isStaff &&
      new Date(line.starts_at).getTime() >
        addDays(input.now, input.settings.bookingHorizonDays).getTime()
    ) {
      throw err.of(ERROR_CODE.SLOT_TOO_FAR_AHEAD)
    }
  }
  for (const [courtId, courtLines] of byCourt) {
    const duration = courtDurations.get(courtId)
    if (!duration) throw err.of(ERROR_CODE.COURT_NOT_BOOKABLE)
    if (
      input.settings.requireContiguousSlots &&
      !areSlotsContiguous(
        courtLines.map((line) => new Date(line.starts_at)),
        duration,
      )
    ) {
      throw err.of(ERROR_CODE.SLOTS_NOT_CONTIGUOUS)
    }
  }
  return bookingDate
}

export async function quoteBooking(
  ctx: Pick<BookingsServiceContext, 'db' | 'now'>,
  input: BookingQuoteInput,
): Promise<Quote> {
  if (input.promo_code) {
    throw err.featureDisabled('Promo akan tersedia bersama modul P1.G.')
  }
  return computeQuote(
    { db: ctx.db },
    {
      kind: 'booking',
      at: ctx.now.toISOString(),
      actor: { role: 'customer' },
      booking: { items: input.items, addons: input.addons },
    },
  )
}

export async function createBooking(
  ctx: BookingsServiceContext,
  input: CreateBookingInput,
): Promise<CreatedBooking> {
  if (input.promo_code) {
    throw err.featureDisabled('Promo akan tersedia bersama modul P1.G.')
  }
  const isStaff = ctx.actor.role === 'staff' || ctx.actor.role === 'admin'
  const channel = bookingChannel(ctx.actor, input, ctx.clientPlatform)
  const customerUserId = ctx.actor.role === 'customer' ? ctx.actor.userId : input.customer_user_id
  const guestName = customerUserId ? null : (input.guest_name ?? null)
  const guestPhone = customerUserId ? null : (input.guest_phone ?? null)
  if (!customerUserId && (!guestName || !guestPhone))
    throw err.of(ERROR_CODE.GUEST_CONTACT_REQUIRED)

  const [quote, settings, pricingCourts] = await Promise.all([
    quoteBooking(ctx, input),
    findBookingSettings(ctx.db),
    findPricingCourts(
      ctx.db,
      input.items.map((item) => item.court_id),
    ),
  ])
  const courtsById = new Map(pricingCourts.map((court) => [court.id, court]))
  const bookingDate = validateBookingShape(
    quote,
    new Map(pricingCourts.map((court) => [court.id, court.slotDurationMinutes])),
    { settings, now: ctx.now, isStaff },
  )
  const quoteSlotLines = slotLines(quote)
  const linesByCourt = new Map<string, PersistedSlotQuoteLine[]>()
  for (const line of quoteSlotLines) {
    const lines = linesByCourt.get(line.ref_id) ?? []
    lines.push(line)
    linesByCourt.set(line.ref_id, lines)
  }
  for (const [courtId, lines] of linesByCourt) {
    const court = courtsById.get(courtId)
    if (
      !court ||
      lines.length < (court.minSlotsPerBooking ?? 1) ||
      lines.length > (court.maxSlotsPerBooking ?? 4)
    ) {
      throw err.of(ERROR_CODE.SLOT_COUNT_OUT_OF_RANGE)
    }
  }

  const reservedKeys: string[] = []
  try {
    for (const [courtId, lines] of linesByCourt) {
      const keys = await reserveBookingHoldKeys(ctx, {
        courtId,
        startsAtList: lines.map((line) => new Date(line.starts_at)),
        ttlSeconds: HOLD_SLOT_TTL_SECONDS,
      })
      reservedKeys.push(...keys)
    }

    return await withTransaction(
      ctx.db,
      async (scope) => {
        if (customerUserId) {
          await lockCustomerBookingLimits(scope.tx, customerUserId)
          const pendingCount = await countCustomerBookings(scope.tx, {
            customerUserId,
            status: 'pending_payment',
          })
          if (pendingCount >= MAX_PENDING_PAYMENT_BOOKINGS_PER_CUSTOMER) {
            throw err.conflict(
              'Selesaikan pembayaran booking sebelumnya sebelum membuat hold baru.',
            )
          }
        }
        const holdExpiresAt = addSeconds(ctx.now, HOLD_SLOT_TTL_SECONDS)
        const booking = await insertBooking(scope.tx, {
          bookingCode: await nextBookingCode(scope.tx, ctx.now),
          customerUserId: customerUserId ?? null,
          guestName,
          guestPhone,
          channel,
          status: 'pending_payment',
          bookingDate,
          slotCount: quoteSlotLines.length,
          quote,
          holdExpiresAt,
          customerNote: input.customer_note ?? null,
          createdByUserId: isStaff ? ctx.actor.userId : null,
          now: ctx.now,
        })
        const items = await insertBookingItems(scope.tx, {
          bookingId: booking.id,
          lines: quoteSlotLines,
        })
        await insertBookingAddons(scope.tx, { bookingId: booking.id, lines: addonLines(quote) })
        const itemBySlot = new Map(
          items.map((item) => [itemKey(item.courtId, item.startsAt), item.id]),
        )
        for (const [courtId, lines] of linesByCourt) {
          const startsAtList = lines.map((line) => new Date(line.starts_at))
          const bookingItemIds = startsAtList.map((startsAt) =>
            itemBySlot.get(itemKey(courtId, startsAt)),
          )
          if (bookingItemIds.some((id) => !id)) throw err.internal()
          await claimBookingHoldSlotsInTransaction(
            ctx,
            {
              courtId,
              startsAtList,
              claimType: 'booking',
              owner: {
                kind: 'booking',
                bookingItemIds: bookingItemIds.filter((id): id is string => !!id),
              },
              mode: 'hold',
              actor: { userId: ctx.actor.userId, role: ctx.actor.role },
            },
            scope,
          )
        }
        return { booking, items, quote }
      },
      { logger: ctx.logger },
    )
  } catch (error) {
    // Key Redis ditahan setelah commit sampai TTL-nya habis. Bila PostgreSQL
    // gagal, key yang berhasil dipasang harus langsung dikembalikan.
    await releaseReservedHoldKeys(ctx, reservedKeys)
    throw error
  }
}

function bookingWindow(items: readonly BookingItemRow[]): { startsAt: Date; endsAt: Date } {
  const startsAt = items.reduce<Date | null>(
    (earliest, item) => (!earliest || item.startsAt < earliest ? item.startsAt : earliest),
    null,
  )
  const endsAt = items.reduce<Date | null>(
    (latest, item) => (!latest || item.endsAt > latest ? item.endsAt : latest),
    null,
  )
  if (!startsAt || !endsAt) throw err.internal()
  return { startsAt, endsAt }
}

export async function checkInBooking(
  ctx: BookingsServiceContext,
  input: { bookingId: string; force: boolean },
): Promise<BookingRow> {
  const found = await findBookingWithItems(ctx.db, input.bookingId)
  if (!found) throw err.notFound('Booking tidak ditemukan.')
  if (found.booking.status !== 'confirmed')
    throw err.conflict('Hanya booking confirmed yang dapat check-in.')
  if (found.booking.checkedInAt) throw err.of(ERROR_CODE.BOOKING_ALREADY_CHECKED_IN)
  const { startsAt, endsAt } = bookingWindow(found.items)
  const opensAt = new Date(startsAt.getTime() - 30 * 60_000)
  if (!input.force && (ctx.now < opensAt || ctx.now > endsAt)) {
    throw err.conflict('Check-in hanya dapat dilakukan 30 menit sebelum sampai akhir jadwal.')
  }
  if (input.force && ctx.actor.role !== 'admin') throw err.forbidden()
  return withTransaction(
    ctx.db,
    async ({ tx }) => {
      const updated = await markBookingCheckedIn(tx, { bookingId: input.bookingId, now: ctx.now })
      if (!updated) throw err.conflict('Status booking berubah. Muat ulang lalu coba lagi.')
      return updated
    },
    { logger: ctx.logger },
  )
}

export async function markBookingAsNoShow(
  ctx: BookingsServiceContext,
  bookingId: string,
): Promise<BookingRow> {
  const found = await findBookingWithItems(ctx.db, bookingId)
  if (!found) throw err.notFound('Booking tidak ditemukan.')
  if (found.booking.status !== 'confirmed')
    throw err.conflict('Hanya booking confirmed yang dapat no-show.')
  return withTransaction(
    ctx.db,
    async ({ tx }) => {
      const updated = await markBookingNoShow(tx, { bookingId, now: ctx.now })
      if (!updated) throw err.conflict('Status booking berubah. Muat ulang lalu coba lagi.')
      return updated
    },
    { logger: ctx.logger },
  )
}
