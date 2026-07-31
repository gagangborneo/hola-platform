import {
  bookingItems,
  bookings,
  courtMaintenances,
  courtOperatingHours,
  courts,
  priceRules,
  slotClaims,
  sports,
  venues,
} from '@hola/db'
import { createRedisKeys } from '@hola/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { redis, safeRedis } from '../../config/redis.ts'
import type { AvailabilityServiceContext } from './availability.service.ts'
import { getCourtAvailability } from './availability.service.ts'
import type { AvailabilityRedisClient } from './availability-cache.ts'

const ids = {
  venue: '01910000-0000-7000-8000-000000000101',
  sport: '01910000-0000-7000-8000-000000000102',
  court: '01910000-0000-7000-8000-000000000103',
  booking: '01910000-0000-7000-8000-000000000104',
  item: '01910000-0000-7000-8000-000000000105',
  maintenance: '01910000-0000-7000-8000-000000000106',
  priceRule: '01910000-0000-7000-8000-000000000107',
  claim: '01910000-0000-7000-8000-000000000108',
} as const

const date = '2026-08-01'
const startsAt = new Date('2026-08-01T00:00:00.000Z')
const now = new Date('2026-07-31T00:00:00.000Z')
const redisKeys = createRedisKeys('local')

const redisOff: AvailabilityRedisClient = {
  get: async () => {
    throw new Error('Redis dimatikan untuk test')
  },
  set: async () => {
    throw new Error('Redis dimatikan untuk test')
  },
  del: async () => {
    throw new Error('Redis dimatikan untuk test')
  },
  scan: async () => {
    throw new Error('Redis dimatikan untuk test')
  },
}

function context(slotRedis: AvailabilityRedisClient = redis): AvailabilityServiceContext {
  return { db, redis: slotRedis, redisKeys, safeRedis, now }
}

async function cleanFixtures(): Promise<void> {
  await redis.del(redisKeys.availability(ids.court, date))
  await db.delete(slotClaims).where(eq(slotClaims.courtId, ids.court))
  await db.delete(bookingItems).where(eq(bookingItems.id, ids.item))
  await db.delete(bookings).where(eq(bookings.id, ids.booking))
  await db.delete(courtMaintenances).where(eq(courtMaintenances.id, ids.maintenance))
  await db.delete(priceRules).where(eq(priceRules.id, ids.priceRule))
  await db.delete(courtOperatingHours).where(eq(courtOperatingHours.courtId, ids.court))
  await db.delete(courts).where(eq(courts.id, ids.court))
  await db.delete(sports).where(eq(sports.id, ids.sport))
  await db.delete(venues).where(eq(venues.id, ids.venue))
}

async function insertFixtures(): Promise<void> {
  await db.insert(venues).values({ id: ids.venue, name: 'Availability fixture venue' })
  await db.insert(sports).values({ id: ids.sport, code: 'AVAIL', name: 'Availability sport' })
  await db.insert(courts).values({
    id: ids.court,
    venueId: ids.venue,
    sportId: ids.sport,
    code: 'AVAIL-01',
    name: 'Availability court',
    slotDurationMinutes: 60,
  })
  await db.insert(courtOperatingHours).values({
    courtId: ids.court,
    dayOfWeek: 6,
    opensTime: '08:00',
    closesTime: '10:00',
  })
  await db.insert(priceRules).values({
    id: ids.priceRule,
    sportId: ids.sport,
    dayType: 'weekend',
    startsTime: '08:00',
    endsTime: '10:00',
    rateClass: 'offpeak',
    pricePerHourAmount: 150_000,
  })
  await db.insert(bookings).values({
    id: ids.booking,
    bookingCode: 'HB-AVAIL-01',
    guestName: 'Availability Guest',
    guestPhone: '+6281234567890',
    channel: 'web',
    status: 'pending_payment',
    bookingDate: date,
    slotCount: 1,
    quoteSnapshot: {},
    subtotalAmount: 150_000,
    totalAmount: 150_000,
    holdExpiresAt: new Date('2026-07-31T00:10:00.000Z'),
  })
  await db.insert(bookingItems).values({
    id: ids.item,
    bookingId: ids.booking,
    courtId: ids.court,
    startsAt,
    endsAt: new Date('2026-08-01T01:00:00.000Z'),
    rateClass: 'offpeak',
    unitPriceAmount: 150_000,
    lineTotalAmount: 150_000,
  })
}

async function waitForRedis(): Promise<void> {
  if (redis.status === 'ready') return
  await new Promise<void>((resolve, reject) => {
    const onReady = (): void => {
      clearTimeout(timeout)
      redis.off('error', onError)
      resolve()
    }
    const onError = (error: Error): void => {
      clearTimeout(timeout)
      redis.off('ready', onReady)
      reject(error)
    }
    const timeout = setTimeout(() => {
      redis.off('ready', onReady)
      redis.off('error', onError)
      reject(new Error('Redis test tidak siap dalam 3 detik'))
    }, 3_000)
    redis.once('ready', onReady)
    redis.once('error', onError)
  })
}

beforeAll(waitForRedis)

beforeEach(async () => {
  await cleanFixtures()
  await insertFixtures()
})

afterAll(cleanFixtures)

describe('availability dengan PostgreSQL dan Redis nyata', () => {
  it('T-B-08 / BR-B-41: hold aktif memblokir slot, lalu response di-cache', async () => {
    await db.insert(slotClaims).values({
      id: ids.claim,
      courtId: ids.court,
      startsAt,
      endsAt: new Date('2026-08-01T01:00:00.000Z'),
      slotDate: date,
      claimType: 'booking',
      status: 'held',
      holdExpiresAt: new Date('2026-07-31T00:10:00.000Z'),
      bookingItemId: ids.item,
    })

    const miss = await getCourtAvailability(context(), { courtId: ids.court, date })
    const hit = await getCourtAvailability(context(), { courtId: ids.court, date })

    expect(miss.cache).toBe('MISS')
    expect(miss.data.slots[0]).toMatchObject({
      is_available: false,
      unavailable_reason: 'booking',
      rate_class: 'offpeak',
      price_amount: 150_000,
    })
    expect(hit.cache).toBe('HIT')
    expect(hit.data).toEqual(miss.data)
  })

  it('T-B-09 / BR-B-35: hold kedaluwarsa dibaca sebagai tersedia tanpa J-01', async () => {
    await db.insert(slotClaims).values({
      id: ids.claim,
      courtId: ids.court,
      startsAt,
      endsAt: new Date('2026-08-01T01:00:00.000Z'),
      slotDate: date,
      claimType: 'booking',
      status: 'held',
      holdExpiresAt: new Date('2026-07-30T23:59:59.000Z'),
      bookingItemId: ids.item,
    })

    const result = await getCourtAvailability(context(), { courtId: ids.court, date })

    expect(result.data.slots[0]).toMatchObject({ is_available: true, unavailable_reason: null })
  })

  it('BR-RD-11 / BR-B-45: cache rusak atau Redis mati menjadi MISS tanpa mengubah hasil', async () => {
    await redis.set(redisKeys.availability(ids.court, date), '{rusak', 'EX', 60)

    const malformedCache = await getCourtAvailability(context(), { courtId: ids.court, date })
    const redisUnavailable = await getCourtAvailability(context(redisOff), {
      courtId: ids.court,
      date,
    })

    expect(malformedCache.cache).toBe('MISS')
    expect(redisUnavailable.cache).toBe('MISS')
    expect(redisUnavailable.data.slots).toEqual(malformedCache.data.slots)
  })
})
