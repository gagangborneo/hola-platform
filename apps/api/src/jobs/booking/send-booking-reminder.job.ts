import { JOB } from '@hola/shared'
import { sendBookingReminder } from '../../modules/bookings/booking-lifecycle.service.ts'
import type { JobHandler } from '../types.ts'

const handler: JobHandler = async (ctx, job) => {
  const bookingId = job.data.bookingId
  if (typeof bookingId !== 'string') throw new Error('bookingId wajib untuk reminder booking')
  await sendBookingReminder(ctx, bookingId)
}

export const sendBookingReminderJob = {
  name: JOB.BOOKING_SEND_BOOKING_REMINDER,
  handler,
} as const
