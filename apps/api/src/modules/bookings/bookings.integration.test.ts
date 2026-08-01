import {
  appSettings,
  bookingItems,
  bookings,
  courtOperatingHours,
  courts,
  priceRules,
  slotClaims,
  sports,
  users,
  venues,
} from '@hola/db'
import { createRedisKeys, SETTINGS_KEY } from '@hola/shared'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { logger } from '../../config/logger.ts'
import { redis, safeRedis } from '../../config/redis.ts'
import { AppError } from '../../lib/errors.ts'
import type { BookingsServiceContext } from './bookings.service.ts'
import {
  cancelBooking,
  checkInBooking,
  createBooking,
  getBookingDetail,
  listAllBookings,
  listMyBookings,
  markBookingAsNoShow,
  updateBookingNotes,
} from './bookings.service.ts'

const ids = {
  venue: '01930000-0000-7000-8000-000000000101',
  sport: '01930000-0000-7000-8000-000000000102',
  court: '01930000-0000-7000-8000-000000000103',
  customer: '01930000-0000-7000-8000-000000000104',
  priceRule: '01930000-0000-7000-8000-000000000105',
} as const

const now = new Date('2026-07-31T00:00:00.000Z')
const bookingDate = '2026-08-01'
const redisKeys = createRedisKeys('local')

function startsAt(hour: number): string {
  return new Date(`2026-08-01T${String(hour - 8).padStart(2, '0')}:00:00.000Z`).toISOString()
}

function context(): BookingsServiceContext {
  return {
    db,
    redis,
    redisKeys,
    safeRedis,
    logger,
    now,
    actor: {
      userId: ids.customer,
      role: 'customer',
      cafeTenantId: undefined,
      employeeId: undefined,
    },
    clientPlatform: 'web',
  }
}

function staffContext(at: Date): BookingsServiceContext {
  return {
    ...context(),
    now: at,
    actor: {
      userId: ids.customer,
      role: 'staff',
      cafeTenantId: undefined,
      employeeId: undefined,
    },
  }
}

function input(hours: readonly number[]) {
  return {
    items: hours.map((hour) => ({ court_id: ids.court, starts_at: startsAt(hour) })),
    addons: [],
  }
}

async function cleanFixtures(): Promise<void> {
  for (let hour = 8; hour < 18; hour += 1) {
    await redis.del(redisKeys.holdSlot(ids.court, startsAt(hour)))
  }
  await db.delete(slotClaims).where(eq(slotClaims.courtId, ids.court))
  await db.delete(bookingItems).where(eq(bookingItems.courtId, ids.court))
  await db.delete(bookings).where(eq(bookings.customerUserId, ids.customer))
  await db
    .delete(appSettings)
    .where(inArray(appSettings.key, [SETTINGS_KEY.REQUIRE_CONTIGUOUS_SLOTS]))
  await db.delete(courtOperatingHours).where(eq(courtOperatingHours.courtId, ids.court))
  await db.delete(priceRules).where(eq(priceRules.id, ids.priceRule))
  await db.delete(courts).where(eq(courts.id, ids.court))
  await db.delete(sports).where(eq(sports.id, ids.sport))
  await db.delete(venues).where(eq(venues.id, ids.venue))
  await db.delete(users).where(eq(users.id, ids.customer))
}

async function insertFixtures(): Promise<void> {
  await db.insert(users).values({
    id: ids.customer,
    role: 'customer',
    email: 'bookings.fixture@example.test',
    fullName: 'Booking Fixture Customer',
  })
  await db.insert(venues).values({ id: ids.venue, name: 'Bookings fixture venue' })
  await db
    .insert(sports)
    .values({ id: ids.sport, code: 'BOOKINGS', name: 'Bookings fixture sport' })
  await db.insert(courts).values({
    id: ids.court,
    venueId: ids.venue,
    sportId: ids.sport,
    code: 'BOOKING-01',
    name: 'Bookings fixture court',
    slotDurationMinutes: 60,
    minSlotsPerBooking: 1,
    maxSlotsPerBooking: 4,
    status: 'active',
  })
  await db.insert(courtOperatingHours).values({
    courtId: ids.court,
    dayOfWeek: 6,
    opensTime: '08:00',
    closesTime: '18:00',
  })
  await db.insert(priceRules).values({
    id: ids.priceRule,
    sportId: ids.sport,
    dayType: 'weekend',
    startsTime: '08:00',
    endsTime: '18:00',
    rateClass: 'offpeak',
    pricePerHourAmount: 150_000,
  })
}

async function waitForRedis(): Promise<void> {
  if (redis.status === 'ready') return
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Redis test tidak siap dalam 3 detik')),
      3_000,
    )
    redis.once('ready', () => {
      clearTimeout(timeout)
      resolve()
    })
    redis.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

beforeAll(waitForRedis)
beforeEach(async () => {
  await cleanFixtures()
  await insertFixtures()
})
afterAll(cleanFixtures)

describe('booking create dengan PostgreSQL dan Redis nyata', () => {
  it('BR-B-13 / BR-B-21 / BR-B-22: quote snapshot, count item, dan held claim dibuat atomik', async () => {
    const created = await createBooking(context(), input([8, 9]))
    const claims = await db
      .select()
      .from(slotClaims)
      .where(eq(slotClaims.bookingItemId, created.items[0]?.id ?? ''))

    expect(created.booking).toMatchObject({
      status: 'pending_payment',
      bookingDate,
      slotCount: 2,
      subtotalAmount: 300_000,
      totalAmount: 300_000,
    })
    expect(created.booking.quoteSnapshot).toEqual(created.quote)
    expect(created.items).toHaveLength(2)
    expect(claims).toHaveLength(1)
    expect(claims[0]).toMatchObject({
      status: 'held',
      holdExpiresAt: created.booking.holdExpiresAt,
    })
  })

  it('T-B-01 / BR-B-40: dua checkout slot yang sama menyisakan tepat satu booking', async () => {
    const result = await Promise.allSettled([
      createBooking(context(), input([10])),
      createBooking(context(), input([10])),
    ])
    expect(result.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1)
    const failed = result.find((entry) => entry.status === 'rejected')
    expect(failed?.status).toBe('rejected')
    if (failed?.status === 'rejected') {
      expect(failed.reason).toBeInstanceOf(AppError)
      expect((failed.reason as AppError).code).toBe('SLOT_ALREADY_CLAIMED')
    }
  })

  it('BR-B-14: customer keempat dengan pending_payment ditolak secara serial', async () => {
    await createBooking(context(), input([8]))
    await createBooking(context(), input([9]))
    await createBooking(context(), input([10]))
    await expect(createBooking(context(), input([11]))).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('BR-B-09: setting contiguous menolak slot yang memiliki celah', async () => {
    await db.insert(appSettings).values({ key: SETTINGS_KEY.REQUIRE_CONTIGUOUS_SLOTS, value: true })
    await expect(createBooking(context(), input([12, 14]))).rejects.toMatchObject({
      code: 'SLOTS_NOT_CONTIGUOUS',
    })
  })

  it('BR-B-80 / BR-B-81 / BR-B-82: check-in hanya confirmed dan pada jendela waktu yang benar', async () => {
    const created = await createBooking(context(), input([8]))
    await db
      .update(bookings)
      .set({ status: 'confirmed', holdExpiresAt: null })
      .where(eq(bookings.id, created.booking.id))

    await expect(
      checkInBooking(staffContext(new Date('2026-07-31T23:00:00.000Z')), {
        bookingId: created.booking.id,
        force: false,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
    const checkedIn = await checkInBooking(staffContext(new Date('2026-08-01T00:00:00.000Z')), {
      bookingId: created.booking.id,
      force: false,
    })
    expect(checkedIn.checkedInAt).toEqual(new Date('2026-08-01T00:00:00.000Z'))
    await expect(
      checkInBooking(staffContext(new Date('2026-08-01T00:00:00.000Z')), {
        bookingId: created.booking.id,
        force: false,
      }),
    ).rejects.toMatchObject({ code: 'BOOKING_ALREADY_CHECKED_IN' })
  })

  it('BR-B-84: no-show mengubah confirmed tanpa melepas slot claim', async () => {
    const created = await createBooking(context(), input([9]))
    await db
      .update(bookings)
      .set({ status: 'confirmed', holdExpiresAt: null })
      .where(eq(bookings.id, created.booking.id))
    await db
      .update(slotClaims)
      .set({ status: 'confirmed', holdExpiresAt: null })
      .where(eq(slotClaims.bookingItemId, created.items[0]?.id ?? ''))

    const noShow = await markBookingAsNoShow(
      staffContext(new Date('2026-08-01T01:00:00.000Z')),
      created.booking.id,
    )
    const [claim] = await db
      .select()
      .from(slotClaims)
      .where(eq(slotClaims.bookingItemId, created.items[0]?.id ?? ''))
    expect(noShow.status).toBe('no_show')
    expect(claim?.status).toBe('confirmed')
  })

  it('P1-39: detail dan notes menegakkan ownership serta batas field berdasarkan role', async () => {
    const created = await createBooking(context(), input([15]))
    expect((await getBookingDetail(context(), created.booking.id)).booking.id).toBe(
      created.booking.id,
    )
    await expect(
      getBookingDetail(
        {
          ...context(),
          actor: { ...context().actor, userId: '01930000-0000-7000-8000-000000000999' },
        },
        created.booking.id,
      ),
    ).rejects.toMatchObject({ code: 'NOT_RESOURCE_OWNER' })

    const customerPatch = await updateBookingNotes(context(), {
      bookingId: created.booking.id,
      customerNote: 'Mohon siapkan net.',
    })
    expect(customerPatch.customerNote).toBe('Mohon siapkan net.')
    await expect(
      updateBookingNotes(context(), {
        bookingId: created.booking.id,
        internalNote: 'tidak boleh',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })

    const staffPatch = await updateBookingNotes(staffContext(now), {
      bookingId: created.booking.id,
      internalNote: 'Customer sudah dihubungi.',
    })
    expect(staffPatch.internalNote).toBe('Customer sudah dihubungi.')
  })

  it('P1-39: daftar admin mendukung pencarian dan riwayat me memakai cursor stabil', async () => {
    const created = await createBooking(context(), input([16]))
    const adminList = await listAllBookings(context(), {
      page: 1,
      per_page: 25,
      q: created.booking.bookingCode,
      sort: '-created_at',
    })
    const myList = await listMyBookings(context(), {
      limit: 20,
      direction: 'forward',
      upcoming: false,
    })
    expect(adminList.rows.map((row) => row.id)).toContain(created.booking.id)
    expect(myList.rows.map((row) => row.id)).toContain(created.booking.id)
    expect(myList.pagination.mode).toBe('cursor')
  })

  it('E-13 / P1-35: expected_total_amount berbeda menolak booking sebelum hold dibuat', async () => {
    await expect(
      createBooking(context(), { ...input([17]), expected_total_amount: 1 }),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      details: { code: 'PRICE_CHANGED' },
    })
    expect(await redis.get(redisKeys.holdSlot(ids.court, startsAt(17)))).toBeNull()
  })

  it('BR-B-11 / BR-B-38 / BR-B-86: staff walk-in memakai direct claim dan check-in otomatis', async () => {
    const created = await createBooking(staffContext(now), {
      ...input([17]),
      channel: 'walk_in',
      customer_user_id: ids.customer,
    })
    const [claim] = await db
      .select()
      .from(slotClaims)
      .where(eq(slotClaims.bookingItemId, created.items[0]?.id ?? ''))
    expect(created.booking).toMatchObject({ status: 'confirmed', channel: 'walk_in' })
    expect(created.booking.checkedInAt).toEqual(created.booking.createdAt)
    expect(claim).toMatchObject({ status: 'confirmed', holdExpiresAt: null })
  })

  it('BR-B-61 / BR-B-66: cancel pending atomik melepas claim dan hold Redis tanpa refund', async () => {
    const created = await createBooking(context(), input([14]))
    const result = await cancelBooking(context(), {
      bookingId: created.booking.id,
      reason: 'Jadwal berubah.',
    })
    const [claim] = await db
      .select()
      .from(slotClaims)
      .where(eq(slotClaims.bookingItemId, created.items[0]?.id ?? ''))
    expect(result).toMatchObject({
      booking: { status: 'cancelled', holdExpiresAt: null },
      refundEstimateAmount: 0,
      policyApplied: 'pending_payment_no_refund',
    })
    expect(claim).toMatchObject({ status: 'released', releaseReason: 'booking_cancelled' })
    expect(await redis.get(redisKeys.holdSlot(ids.court, startsAt(14)))).toBeNull()
  })
})
