import { JOB } from '@hola/shared'
import { releaseExpiredBookingHolds } from '../../modules/bookings/booking-lifecycle.service.ts'
import type { JobHandler } from '../types.ts'

const handler: JobHandler = async (ctx) => {
  await releaseExpiredBookingHolds(ctx)
}

export const releaseExpiredHoldsJob = {
  name: JOB.BOOKING_RELEASE_EXPIRED_HOLDS,
  handler,
} as const
