/** J-06 payment.reconcilePending. */
import { JOB } from '@hola/shared'
import { reconcilePendingPayments } from '../../modules/payments/payments.service.ts'
import type { JobHandler } from '../types.ts'

export const reconcilePendingPaymentsJob = {
  name: JOB.PAYMENT_RECONCILE_PENDING,
  handler: (async (ctx) => {
    await reconcilePendingPayments(ctx)
  }) satisfies JobHandler,
} as const
