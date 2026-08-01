/** Penjadwalan lifecycle booking. Kebenaran status tetap berasal dari PostgreSQL. */
import { JOB, QUEUE } from '@hola/shared'
import { enqueueJobTo } from '../../config/queues.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'

type BookingJobContext = Pick<CoreDependencies, 'queues' | 'logger'> & { now: Date }

export function bookingReminderJobId(bookingId: string): string {
  return `reminder-${bookingId}`
}

export function bookingNoShowJobId(bookingId: string): string {
  return `noshow-${bookingId}`
}

export async function scheduleBookingJobs(
  ctx: BookingJobContext,
  input: { bookingId: string; startsAt: Date; endsAt: Date },
): Promise<void> {
  await Promise.all([scheduleBookingReminderJob(ctx, input), scheduleBookingNoShowJob(ctx, input)])
}

export async function scheduleBookingReminderJob(
  ctx: BookingJobContext,
  input: { bookingId: string; startsAt: Date },
): Promise<void> {
  await enqueueJobTo(
    ctx.queues,
    JOB.BOOKING_SEND_BOOKING_REMINDER,
    { bookingId: input.bookingId },
    {
      jobId: bookingReminderJobId(input.bookingId),
      delay: Math.max(0, input.startsAt.getTime() - 2 * 60 * 60_000 - ctx.now.getTime()),
    },
  )
}

export async function scheduleBookingNoShowJob(
  ctx: BookingJobContext,
  input: { bookingId: string; endsAt: Date },
): Promise<void> {
  await enqueueJobTo(
    ctx.queues,
    JOB.BOOKING_MARK_NO_SHOW,
    { bookingId: input.bookingId },
    {
      jobId: bookingNoShowJobId(input.bookingId),
      delay: Math.max(0, input.endsAt.getTime() + 30 * 60_000 - ctx.now.getTime()),
    },
  )
}

/** Best-effort: kegagalan Redis tidak boleh membatalkan status booking di PostgreSQL. */
export async function cancelBookingJobs(
  ctx: Pick<BookingJobContext, 'queues' | 'logger'>,
  bookingId: string,
): Promise<void> {
  const queue = ctx.queues[QUEUE.BOOKING]
  const removals = await Promise.allSettled([
    queue.remove(bookingReminderJobId(bookingId)),
    queue.remove(bookingNoShowJobId(bookingId)),
  ])
  for (const [index, result] of removals.entries()) {
    if (result.status === 'rejected') {
      ctx.logger.warn(
        {
          err: result.reason,
          booking_id: bookingId,
          job_id: index === 0 ? bookingReminderJobId(bookingId) : bookingNoShowJobId(bookingId),
        },
        'pembatalan job booking gagal; handler tetap memeriksa status PostgreSQL',
      )
    }
  }
}

/** BR-B-58: fondasi reschedule Phase 2 me-remove job lama sebelum memasang jadwal baru. */
export async function replaceBookingJobs(
  ctx: BookingJobContext,
  input: { bookingId: string; startsAt: Date; endsAt: Date },
): Promise<void> {
  await cancelBookingJobs(ctx, input.bookingId)
  await scheduleBookingJobs(ctx, input)
}
