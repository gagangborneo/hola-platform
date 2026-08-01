import { JOB } from '@hola/shared'
import { markBookingNoShow } from '../../modules/bookings/booking-lifecycle.service.ts'
import type { JobHandler } from '../types.ts'

const handler: JobHandler = async (ctx, job) => {
  const bookingId = job.data.bookingId
  if (typeof bookingId !== 'string') throw new Error('bookingId wajib untuk no-show booking')
  await markBookingNoShow(ctx, bookingId)
}

export const markNoShowJob = {
  name: JOB.BOOKING_MARK_NO_SHOW,
  handler,
} as const
