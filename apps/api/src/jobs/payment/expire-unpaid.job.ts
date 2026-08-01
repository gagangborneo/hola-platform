/** J-07 payment.expireUnpaid. */
import { JOB } from '@hola/shared'
import { UnrecoverableError } from 'bullmq'
import { z } from 'zod'
import { expireUnpaidPayment } from '../../modules/payments/payments.service.ts'
import type { JobHandler } from '../types.ts'

const payloadSchema = z.object({ paymentId: z.string().uuid() }).strict()
export const expireUnpaidPaymentJob = {
  name: JOB.PAYMENT_EXPIRE_UNPAID,
  handler: (async (ctx, job) => {
    const parsed = payloadSchema.safeParse(job.data)
    if (!parsed.success) throw new UnrecoverableError('Payload J-07 tidak valid')
    await expireUnpaidPayment(ctx, parsed.data.paymentId)
  }) satisfies JobHandler,
} as const
