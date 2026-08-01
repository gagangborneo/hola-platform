/** Business orchestration untuk J-01 sampai J-04. */
import { TEMPLATE_CODE } from '@hola/shared'
import { withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import {
  enqueueEmailNotification,
  writeEmailNotification,
} from '../notifications/notification.service.ts'
import { releaseExpiredBookingHoldsInTransaction } from '../slots/slots.service.ts'
import { scheduleBookingNoShowJob, scheduleBookingReminderJob } from './booking-jobs.ts'
import {
  completeDueBookings,
  expirePendingBookings,
  findBookingRecipient,
  findBookingWithItems,
  findDueNoShowCandidates,
  findUpcomingReminderCandidates,
  markBookingNoShowIfDue,
} from './bookings.repository.ts'

export type BookingLifecycleContext = Pick<
  CoreDependencies,
  'db' | 'redis' | 'redisKeys' | 'safeRedis' | 'logger' | 'queues'
> & { now: Date }

/** J-01/T-B-04: kedua UPDATE bersyarat aman dijalankan berulang. */
export async function releaseExpiredBookingHolds(
  ctx: BookingLifecycleContext,
): Promise<{ releasedClaims: number; expiredBookings: number }> {
  return withTransaction(
    ctx.db,
    async (scope) => {
      const released = await releaseExpiredBookingHoldsInTransaction(ctx, scope)
      const expired = await expirePendingBookings(scope.tx, ctx.now)
      return { releasedClaims: released.length, expiredBookings: expired.length }
    },
    { logger: ctx.logger },
  )
}

/** J-02: complete yang check-in lalu pulihkan delayed J-03/J-04 dari PostgreSQL. */
export async function autoCompleteBookings(
  ctx: BookingLifecycleContext,
): Promise<{ completed: number; remindersSwept: number; noShowsSwept: number }> {
  return withTransaction(
    ctx.db,
    async (scope) => {
      const completed = await completeDueBookings(scope.tx, ctx.now)
      const reminders = await findUpcomingReminderCandidates(scope.tx, ctx.now)
      const noShows = await findDueNoShowCandidates(scope.tx, ctx.now)
      scope.afterCommit(async () => {
        await Promise.all([
          ...reminders.map((candidate) =>
            scheduleBookingReminderJob(ctx, {
              bookingId: candidate.bookingId,
              startsAt: candidate.startsAt,
            }),
          ),
          ...noShows.map((candidate) =>
            scheduleBookingNoShowJob(ctx, {
              bookingId: candidate.bookingId,
              endsAt: candidate.endsAt,
            }),
          ),
        ])
      })
      return {
        completed: completed.length,
        remindersSwept: reminders.length,
        noShowsSwept: noShows.length,
      }
    },
    { logger: ctx.logger },
  )
}

/** J-03: dedupe PostgreSQL menghasilkan tepat satu email dan satu inbox. */
export async function sendBookingReminder(
  ctx: BookingLifecycleContext,
  bookingId: string,
): Promise<void> {
  await withTransaction(
    ctx.db,
    async (scope) => {
      const found = await findBookingWithItems(scope.tx, bookingId)
      if (found?.booking.status !== 'confirmed' || found.items.length === 0) return
      const startsAt = found.items.reduce(
        (earliest, item) => (item.startsAt < earliest ? item.startsAt : earliest),
        found.items[0]?.startsAt ?? ctx.now,
      )
      if (startsAt <= ctx.now) return
      const recipient = await findBookingRecipient(scope.tx, bookingId)
      if (!recipient?.email) return
      const notification = await writeEmailNotification(
        scope.tx,
        {
          userId: recipient.userId,
          toEmail: recipient.email,
          templateCode: TEMPLATE_CODE.BOOKING_REMINDER_2H,
          dedupeKey: `booking:${bookingId}:reminder2h`,
          relatedType: 'booking',
          relatedId: bookingId,
          payload: {
            full_name: recipient.fullName,
            booking_code: found.booking.bookingCode,
            starts_at: startsAt.toISOString(),
          },
        },
        ctx.now,
      )
      if (notification) scope.afterCommit(() => enqueueEmailNotification(ctx, notification.id))
    },
    { logger: ctx.logger },
  )
}

/** J-04: UPDATE menguji ulang status, check-in, dan ends_at + 30 menit. */
export async function markBookingNoShow(
  ctx: BookingLifecycleContext,
  bookingId: string,
): Promise<void> {
  await withTransaction(
    ctx.db,
    async ({ tx }) => {
      await markBookingNoShowIfDue(tx, { bookingId, now: ctx.now })
    },
    { logger: ctx.logger },
  )
}
