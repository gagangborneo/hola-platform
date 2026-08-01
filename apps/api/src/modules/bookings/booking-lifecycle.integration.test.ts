import {
  bookingItems,
  bookings,
  courts,
  notifications,
  slotClaims,
  sports,
  users,
  venues,
} from '@hola/db'
import { JOB, QUEUE, TEMPLATE_CODE } from '@hola/shared'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../config/db.ts'
import { logger } from '../../config/logger.ts'
import type { QueueProducers } from '../../config/queues.ts'
import { keys, redis, safeRedis } from '../../config/redis.ts'
import { autoCompleteBookingsJob } from '../../jobs/booking/auto-complete-bookings.job.ts'
import { markNoShowJob } from '../../jobs/booking/mark-no-show.job.ts'
import { releaseExpiredHoldsJob } from '../../jobs/booking/release-expired-holds.job.ts'
import { sendBookingReminderJob } from '../../jobs/booking/send-booking-reminder.job.ts'
import type { RegisteredJob, WorkerRuntime } from '../../jobs/types.ts'

const ids = {
  venue: '01950000-0000-7000-8000-000000000101',
  sport: '01950000-0000-7000-8000-000000000102',
  court: '01950000-0000-7000-8000-000000000103',
  customer: '01950000-0000-7000-8000-000000000104',
  expired: '01950000-0000-7000-8000-000000000105',
  completed: '01950000-0000-7000-8000-000000000106',
  reminder: '01950000-0000-7000-8000-000000000107',
  noShow: '01950000-0000-7000-8000-000000000108',
  expiredItem: '01950000-0000-7000-8000-000000000109',
  completedItem: '01950000-0000-7000-8000-000000000110',
  reminderItem: '01950000-0000-7000-8000-000000000111',
  noShowItem: '01950000-0000-7000-8000-000000000112',
  expiredClaim: '01950000-0000-7000-8000-000000000113',
} as const

const now = new Date('2026-08-01T12:00:00.000Z')
const queueAdd = vi.fn(async () => undefined)
const queueRemove = vi.fn(async () => 1)
const queues = Object.fromEntries(
  Object.values(QUEUE).map((queue) => [queue, { add: queueAdd, remove: queueRemove }]),
) as unknown as QueueProducers

// Aman untuk test handler: keempat job booking hanya membaca dependency subset ini.
const runtime = {
  db,
  logger,
  queues,
  redis,
  redisKeys: keys,
  safeRedis,
  now,
} as unknown as WorkerRuntime

// Boundary BullMQ sengaja diperkecil ke properti yang dibaca handler.
function job(name: string, data: Record<string, unknown> = {}): RegisteredJob {
  return { id: `test-${name}`, name, data } as RegisteredJob
}

const bookingIds = [ids.expired, ids.completed, ids.reminder, ids.noShow]

async function cleanFixtures(): Promise<void> {
  await db.delete(notifications).where(eq(notifications.userId, ids.customer))
  await db.delete(slotClaims).where(eq(slotClaims.courtId, ids.court))
  await db.delete(bookingItems).where(inArray(bookingItems.bookingId, bookingIds))
  await db.delete(bookings).where(inArray(bookings.id, bookingIds))
  await db.delete(courts).where(eq(courts.id, ids.court))
  await db.delete(sports).where(eq(sports.id, ids.sport))
  await db.delete(venues).where(eq(venues.id, ids.venue))
  await db.delete(users).where(eq(users.id, ids.customer))
}

async function insertFixtures(): Promise<void> {
  await db.insert(users).values({
    id: ids.customer,
    role: 'customer',
    email: 'booking-jobs@example.test',
    fullName: 'Booking Jobs Fixture',
  })
  await db.insert(venues).values({ id: ids.venue, name: 'Booking jobs venue' })
  await db.insert(sports).values({ id: ids.sport, code: 'BOOKJOB', name: 'Booking jobs sport' })
  await db.insert(courts).values({
    id: ids.court,
    venueId: ids.venue,
    sportId: ids.sport,
    code: 'BOOK-JOB-01',
    name: 'Booking jobs court',
    status: 'active',
  })

  const base = {
    customerUserId: ids.customer,
    channel: 'web' as const,
    bookingDate: '2026-08-01',
    slotCount: 1,
    quoteSnapshot: {},
    subtotalAmount: 100_000,
    totalAmount: 100_000,
  }
  await db.insert(bookings).values([
    {
      ...base,
      id: ids.expired,
      bookingCode: 'HB-JOB-EXPIRED',
      status: 'pending_payment',
      holdExpiresAt: new Date('2026-08-01T11:50:00.000Z'),
    },
    {
      ...base,
      id: ids.completed,
      bookingCode: 'HB-JOB-COMPLETED',
      status: 'confirmed',
      checkedInAt: new Date('2026-08-01T10:00:00.000Z'),
    },
    {
      ...base,
      id: ids.reminder,
      bookingCode: 'HB-JOB-REMINDER',
      status: 'confirmed',
    },
    {
      ...base,
      id: ids.noShow,
      bookingCode: 'HB-JOB-NOSHOW',
      status: 'confirmed',
    },
  ])
  await db.insert(bookingItems).values([
    {
      id: ids.expiredItem,
      bookingId: ids.expired,
      courtId: ids.court,
      startsAt: new Date('2026-08-02T00:00:00.000Z'),
      endsAt: new Date('2026-08-02T01:00:00.000Z'),
      rateClass: 'offpeak',
      unitPriceAmount: 100_000,
      lineTotalAmount: 100_000,
    },
    {
      id: ids.completedItem,
      bookingId: ids.completed,
      courtId: ids.court,
      startsAt: new Date('2026-08-01T10:00:00.000Z'),
      endsAt: new Date('2026-08-01T11:00:00.000Z'),
      rateClass: 'offpeak',
      unitPriceAmount: 100_000,
      lineTotalAmount: 100_000,
    },
    {
      id: ids.reminderItem,
      bookingId: ids.reminder,
      courtId: ids.court,
      startsAt: new Date('2026-08-01T13:30:00.000Z'),
      endsAt: new Date('2026-08-01T14:30:00.000Z'),
      rateClass: 'offpeak',
      unitPriceAmount: 100_000,
      lineTotalAmount: 100_000,
    },
    {
      id: ids.noShowItem,
      bookingId: ids.noShow,
      courtId: ids.court,
      startsAt: new Date('2026-08-01T10:00:00.000Z'),
      endsAt: new Date('2026-08-01T11:00:00.000Z'),
      rateClass: 'offpeak',
      unitPriceAmount: 100_000,
      lineTotalAmount: 100_000,
    },
  ])
  await db.insert(slotClaims).values({
    id: ids.expiredClaim,
    courtId: ids.court,
    startsAt: new Date('2026-08-02T00:00:00.000Z'),
    endsAt: new Date('2026-08-02T01:00:00.000Z'),
    slotDate: '2026-08-02',
    claimType: 'booking',
    status: 'held',
    holdExpiresAt: new Date('2026-08-01T11:50:00.000Z'),
    bookingItemId: ids.expiredItem,
  })
}

beforeEach(async () => {
  await cleanFixtures()
  await insertFixtures()
  queueAdd.mockClear()
  queueRemove.mockClear()
})
afterAll(cleanFixtures)

describe('P1.J booking jobs dengan PostgreSQL nyata', () => {
  it('T-B-04/BR-TT-14/J-01: handler dua kali melepas hold dan expire booking tepat sekali', async () => {
    const input = job(JOB.BOOKING_RELEASE_EXPIRED_HOLDS)
    await releaseExpiredHoldsJob.handler(runtime, input)
    await releaseExpiredHoldsJob.handler(runtime, input)

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, ids.expired))
    const [claim] = await db.select().from(slotClaims).where(eq(slotClaims.id, ids.expiredClaim))
    expect(booking).toMatchObject({ status: 'expired', holdExpiresAt: null })
    expect(claim).toMatchObject({ status: 'released', releaseReason: 'hold_expired' })
  })

  it('BR-B-17/BR-B-18/BR-TT-14/J-02: dua run complete dan sweeper berakhir identik', async () => {
    const input = job(JOB.BOOKING_AUTO_COMPLETE_BOOKINGS)
    await autoCompleteBookingsJob.handler(runtime, input)
    await autoCompleteBookingsJob.handler(runtime, input)

    const rows = await db.select().from(bookings).where(inArray(bookings.id, bookingIds))
    expect(rows.find((row) => row.id === ids.completed)?.status).toBe('completed')
    expect(rows.find((row) => row.id === ids.noShow)?.status).toBe('confirmed')
    expect(queueAdd).toHaveBeenCalledWith(
      JOB.BOOKING_SEND_BOOKING_REMINDER,
      { bookingId: ids.reminder },
      expect.objectContaining({ jobId: `reminder-${ids.reminder}` }),
    )
    expect(queueAdd).toHaveBeenCalledWith(
      JOB.BOOKING_MARK_NO_SHOW,
      { bookingId: ids.noShow },
      expect.objectContaining({ jobId: `noshow-${ids.noShow}`, delay: 0 }),
    )
  })

  it('BR-TT-14/J-03: handler reminder dua kali menulis satu email dan satu in-app', async () => {
    const input = job(JOB.BOOKING_SEND_BOOKING_REMINDER, { bookingId: ids.reminder })
    await sendBookingReminderJob.handler(runtime, input)
    await sendBookingReminderJob.handler(runtime, input)

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.templateCode, TEMPLATE_CODE.BOOKING_REMINDER_2H))
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.channel).sort()).toEqual(['email', 'inapp'])
    expect(queueAdd).toHaveBeenCalledTimes(1)
  })

  it('BR-B-18/BR-B-84/BR-TT-14/J-04: handler dua kali menghasilkan satu transisi no-show', async () => {
    const input = job(JOB.BOOKING_MARK_NO_SHOW, { bookingId: ids.noShow })
    await markNoShowJob.handler(runtime, input)
    await markNoShowJob.handler(runtime, input)

    const [booking] = await db.select().from(bookings).where(eq(bookings.id, ids.noShow))
    expect(booking?.status).toBe('no_show')
    expect(booking?.completedAt).toBeNull()
  })
})
