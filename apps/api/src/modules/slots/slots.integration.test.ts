import {
  bookingItems,
  bookings,
  courtMaintenances,
  courtOperatingHours,
  courts,
  slotClaims,
  specialDates,
  sports,
  users,
  venues,
} from '@hola/db'
import { createRedisKeys } from '@hola/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { logger } from '../../config/logger.ts'
import { redis, safeRedis } from '../../config/redis.ts'
import {
  claimSlots,
  releaseSlots,
  type SlotRedisClient,
  type SlotsServiceContext,
} from './slots.service.ts'

const ids = {
  venue: '01900000-0000-7000-8000-000000000101',
  sport: '01900000-0000-7000-8000-000000000102',
  court: '01900000-0000-7000-8000-000000000103',
  user: '01900000-0000-7000-8000-000000000104',
  bookingOne: '01900000-0000-7000-8000-000000000105',
  bookingTwo: '01900000-0000-7000-8000-000000000106',
  bookingThree: '01900000-0000-7000-8000-000000000107',
  bookingFour: '01900000-0000-7000-8000-000000000108',
  itemOne: '01900000-0000-7000-8000-000000000109',
  itemTwo: '01900000-0000-7000-8000-000000000110',
  itemThree: '01900000-0000-7000-8000-000000000111',
  itemFour: '01900000-0000-7000-8000-000000000112',
  specialDate: '01900000-0000-7000-8000-000000000113',
  maintenance: '01900000-0000-7000-8000-000000000114',
} as const

const startsAt = new Date('2026-08-01T00:00:00.000Z') // 08:00 WITA, Sabtu
const now = new Date('2026-07-31T00:00:00.000Z')
const redisKeys = createRedisKeys('local')

const redisOff: SlotRedisClient = {
  set: async () => {
    throw new Error('Redis sengaja dimatikan untuk test race')
  },
  del: async () => {
    throw new Error('Redis sengaja dimatikan untuk test race')
  },
}

function context(at: Date, slotRedis: SlotRedisClient = redis): SlotsServiceContext {
  return { db, redis: slotRedis, redisKeys, safeRedis, logger, now: at }
}

function bookingInput(bookingItemId: string) {
  return {
    courtId: ids.court,
    startsAtList: [startsAt],
    claimType: 'booking' as const,
    owner: { kind: 'booking' as const, bookingItemIds: [bookingItemId] },
    mode: 'hold' as const,
    actor: { role: 'customer' as const, userId: ids.user },
  }
}

async function clearRedisFixture(): Promise<void> {
  await redis.del(redisKeys.holdSlot(ids.court, startsAt.toISOString()))
  await redis.del(redisKeys.availability(ids.court, '2026-08-01'))
}

async function cleanFixtures(): Promise<void> {
  await clearRedisFixture()
  await db.delete(slotClaims).where(eq(slotClaims.courtId, ids.court))
  await db.delete(bookingItems).where(eq(bookingItems.courtId, ids.court))
  await db.delete(bookings).where(eq(bookings.customerUserId, ids.user))
  await db.delete(specialDates).where(eq(specialDates.id, ids.specialDate))
  await db.delete(courtMaintenances).where(eq(courtMaintenances.id, ids.maintenance))
  await db.delete(courtOperatingHours).where(eq(courtOperatingHours.courtId, ids.court))
  await db.delete(courts).where(eq(courts.id, ids.court))
  await db.delete(sports).where(eq(sports.id, ids.sport))
  await db.delete(venues).where(eq(venues.id, ids.venue))
  await db.delete(users).where(eq(users.id, ids.user))
}

async function insertFixtures(): Promise<void> {
  await db.insert(users).values({
    id: ids.user,
    role: 'customer',
    email: 'slots.fixture@example.test',
    fullName: 'Slots Fixture Customer',
  })
  await db.insert(venues).values({ id: ids.venue, name: 'Slots fixture venue' })
  await db.insert(sports).values({ id: ids.sport, code: 'SLOTS', name: 'Slots fixture sport' })
  await db.insert(courts).values({
    id: ids.court,
    venueId: ids.venue,
    sportId: ids.sport,
    code: 'SLOTS-01',
    name: 'Slots fixture court',
    slotDurationMinutes: 60,
    status: 'active',
  })
  await db.insert(courtOperatingHours).values({
    courtId: ids.court,
    dayOfWeek: 6,
    opensTime: '08:00',
    closesTime: '20:00',
  })
  await db.insert(courtOperatingHours).values({
    courtId: ids.court,
    dayOfWeek: 4,
    opensTime: '08:00',
    closesTime: '20:00',
  })
  await db.insert(courtMaintenances).values({
    id: ids.maintenance,
    courtId: ids.court,
    startsAt,
    endsAt: new Date('2026-08-01T01:00:00.000Z'),
    reason: 'Fixture maintenance',
  })
  const bookingRows = [ids.bookingOne, ids.bookingTwo, ids.bookingThree, ids.bookingFour].map(
    (id, index) => ({
      id,
      bookingCode: `HB-SLOTS-${index + 1}`,
      customerUserId: ids.user,
      channel: 'web' as const,
      status: 'pending_payment' as const,
      bookingDate: '2026-08-01',
      slotCount: 1,
      quoteSnapshot: {},
      subtotalAmount: 100_000,
      totalAmount: 100_000,
      holdExpiresAt: new Date('2026-07-31T00:10:00.000Z'),
    }),
  )
  await db.insert(bookings).values(bookingRows)
  await db.insert(bookingItems).values(
    [ids.itemOne, ids.itemTwo, ids.itemThree, ids.itemFour].map((id, index) => ({
      id,
      bookingId: bookingRows[index]?.id ?? ids.bookingOne,
      courtId: ids.court,
      startsAt,
      endsAt: new Date('2026-08-01T01:00:00.000Z'),
      rateClass: 'offpeak' as const,
      unitPriceAmount: 100_000,
      lineTotalAmount: 100_000,
    })),
  )
}

beforeEach(async () => {
  await cleanFixtures()
  await insertFixtures()
})

afterAll(cleanFixtures)

describe('slots.claim dengan PostgreSQL dan Redis nyata', () => {
  it.each([
    ['Redis hidup', redis],
    ['Redis mati', redisOff],
  ] as const)(
    'T-B-01 / S-1: race slot sama (%s) selalu hanya satu pemenang',
    async (_name, slotRedis) => {
      const result = await Promise.allSettled([
        claimSlots(context(now, slotRedis), bookingInput(ids.itemOne)),
        claimSlots(context(now, slotRedis), bookingInput(ids.itemTwo)),
      ])
      const fulfilled = result.filter(
        (entry): entry is PromiseFulfilledResult<Awaited<ReturnType<typeof claimSlots>>> =>
          entry.status === 'fulfilled',
      )
      const rejected = result.filter(
        (entry): entry is PromiseRejectedResult => entry.status === 'rejected',
      )

      expect(fulfilled).toHaveLength(1)
      expect(rejected).toHaveLength(1)
      expect(rejected[0]?.reason).toMatchObject({ code: 'SLOT_ALREADY_CLAIMED' })
      const claims = await db.select().from(slotClaims).where(eq(slotClaims.courtId, ids.court))
      expect(claims.filter((claim) => claim.status === 'held')).toHaveLength(1)
    },
  )

  it('T-B-03 / S-2: hold kedaluwarsa diambil alih tanpa menunggu J-01', async () => {
    const first = await claimSlots(context(now), bookingInput(ids.itemOne))
    await clearRedisFixture() // mensimulasikan TTL Redis yang telah habis.

    const second = await claimSlots(
      context(new Date('2026-07-31T00:11:00.000Z')),
      bookingInput(ids.itemTwo),
    )

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    const claims = await db.select().from(slotClaims).where(eq(slotClaims.courtId, ids.court))
    expect(claims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: first[0]?.id,
          status: 'released',
          releaseReason: 'hold_expired',
        }),
        expect.objectContaining({ id: second[0]?.id, status: 'held' }),
      ]),
    )
  })

  it('S-8 / S-12: release idempoten, menghapus hold Redis, dan menjaga riwayat', async () => {
    const [claim] = await claimSlots(context(now), bookingInput(ids.itemOne))
    const claimId = claim?.id
    expect(claimId).toBeDefined()
    if (!claimId) throw new Error('fixture claim tidak dibuat')

    const firstRelease = await releaseSlots(context(now), {
      claimIds: [claimId],
      reason: 'booking_cancelled',
    })
    const secondRelease = await releaseSlots(context(now), {
      claimIds: [claimId],
      reason: 'booking_cancelled',
    })

    expect(firstRelease).toHaveLength(1)
    expect(secondRelease).toEqual([])
    expect(await redis.get(redisKeys.holdSlot(ids.court, startsAt.toISOString()))).toBeNull()
    const [stored] = await db.select().from(slotClaims).where(eq(slotClaims.id, claimId))
    expect(stored).toMatchObject({ status: 'released', releaseReason: 'booking_cancelled' })
  })

  it('S-10 dan S-11: booking masa lalu atau hari tutup ditolak, klaim maintenance internal diizinkan', async () => {
    const pastStartsAt = new Date('2026-07-30T00:00:00.000Z')
    await expect(
      claimSlots(context(now), { ...bookingInput(ids.itemOne), startsAtList: [pastStartsAt] }),
    ).rejects.toMatchObject({ code: 'SLOT_IN_PAST' })
    await db.insert(specialDates).values({
      id: ids.specialDate,
      date: '2026-08-01',
      name: 'Venue tutup fixture',
      isClosed: true,
    })
    await expect(claimSlots(context(now), bookingInput(ids.itemTwo))).rejects.toMatchObject({
      code: 'VENUE_CLOSED',
    })
    await expect(
      claimSlots(context(now), {
        courtId: ids.court,
        startsAtList: [pastStartsAt],
        claimType: 'maintenance',
        owner: { kind: 'maintenance', courtMaintenanceId: ids.maintenance },
        mode: 'direct',
        actor: { role: 'admin', userId: ids.user },
      }),
    ).resolves.toHaveLength(1)
  })
})
