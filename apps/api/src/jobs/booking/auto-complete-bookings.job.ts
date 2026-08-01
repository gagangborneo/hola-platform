import { JOB } from '@hola/shared'
import { autoCompleteBookings } from '../../modules/bookings/booking-lifecycle.service.ts'
import type { JobHandler } from '../types.ts'

const handler: JobHandler = async (ctx) => {
  await autoCompleteBookings(ctx)
}

export const autoCompleteBookingsJob = {
  name: JOB.BOOKING_AUTO_COMPLETE_BOOKINGS,
  handler,
} as const
