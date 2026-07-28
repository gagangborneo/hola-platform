/** J-25 notification.sendEmail. */
import { JOB } from '@hola/shared'
import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'
import { sendQueuedEmail } from '../../modules/notifications/notification.service.ts'
import type { JobHandler } from '../types.ts'

const payloadSchema = z.object({ notificationId: z.uuid() })

export const sendEmailJob = {
  name: JOB.NOTIFICATION_SEND_EMAIL,
  handler: (async (ctx, job) => {
    const parsed = payloadSchema.safeParse(job.data)
    if (!parsed.success) throw new UnrecoverableError('Payload J-25 tidak valid')
    await sendQueuedEmail(ctx, parsed.data.notificationId)
  }) satisfies JobHandler,
} as const
