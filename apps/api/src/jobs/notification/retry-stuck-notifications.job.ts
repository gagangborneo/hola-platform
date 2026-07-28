/** J-36 notification.retryStuckNotifications. */
import { JOB } from '@hola/shared'
import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'
import { retryStuckNotifications } from '../../modules/notifications/notification.service.ts'
import type { JobHandler } from '../types.ts'

const payloadSchema = z.object({}).strict()

export const retryStuckNotificationsJob = {
  name: JOB.NOTIFICATION_RETRY_STUCK_NOTIFICATIONS,
  handler: (async (ctx, job) => {
    if (!payloadSchema.safeParse(job.data).success)
      throw new UnrecoverableError('Payload J-36 tidak valid')
    await retryStuckNotifications(ctx)
  }) satisfies JobHandler,
} as const
