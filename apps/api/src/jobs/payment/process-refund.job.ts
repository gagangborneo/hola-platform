/** J-08 payment.processRefund — Phase 1 selalu manual. */
import { JOB } from '@hola/shared'
import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'
import { processManualRefund } from '../../modules/refunds/refunds.service.ts'
import type { JobHandler } from '../types.ts'

const payloadSchema = z.object({ refundId: z.string().uuid() }).strict()
export const processRefundJob = {
  name: JOB.PAYMENT_PROCESS_REFUND,
  handler: (async (ctx, job) => {
    const parsed = payloadSchema.safeParse(job.data)
    if (!parsed.success) throw new UnrecoverableError('Payload J-08 tidak valid')
    await processManualRefund(ctx, parsed.data.refundId)
  }) satisfies JobHandler,
} as const
