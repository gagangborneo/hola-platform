/** J-05 payment.processWebhook. */
import { JOB } from '@hola/shared'
import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'
import { processMidtransWebhook } from '../../modules/payments/payments.service.ts'
import type { JobHandler } from '../types.ts'

const payloadSchema = z.object({ providerEventId: z.string().min(1).max(500) }).strict()

export const processPaymentWebhookJob = {
  name: JOB.PAYMENT_PROCESS_WEBHOOK,
  handler: (async (ctx, job) => {
    const parsed = payloadSchema.safeParse(job.data)
    if (!parsed.success) throw new UnrecoverableError('Payload J-05 tidak valid')
    await processMidtransWebhook(ctx, parsed.data.providerEventId)
  }) satisfies JobHandler,
} as const
