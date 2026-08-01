/** J-09 commerce.releaseExpiredPromoReservations. */
import { JOB } from '@hola/shared'
import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'
import { releaseExpiredPromoReservations } from '../../modules/promos/promos.service.ts'
import type { JobHandler } from '../types.ts'

const payloadSchema = z.object({}).strict()

export const releaseExpiredPromoReservationsJob = {
  name: JOB.COMMERCE_RELEASE_EXPIRED_PROMO_RESERVATIONS,
  handler: (async (ctx, job) => {
    if (!payloadSchema.safeParse(job.data).success) {
      throw new UnrecoverableError('Payload J-09 tidak valid')
    }
    await releaseExpiredPromoReservations(ctx)
  }) satisfies JobHandler,
} as const
