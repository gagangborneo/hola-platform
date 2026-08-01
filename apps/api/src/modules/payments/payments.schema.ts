import {
  idParam,
  idSchema,
  money,
  offsetPaginationQuery,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
} from '@hola/shared'
import { z } from 'zod'

const status = z.enum([
  PAYMENT_STATUS.PENDING,
  PAYMENT_STATUS.PAID,
  PAYMENT_STATUS.EXPIRED,
  PAYMENT_STATUS.FAILED,
  PAYMENT_STATUS.CANCELLED,
])
const method = z.enum([
  PAYMENT_METHOD.QRIS,
  PAYMENT_METHOD.GOPAY,
  PAYMENT_METHOD.SHOPEEPAY,
  PAYMENT_METHOD.BANK_TRANSFER_VA,
  PAYMENT_METHOD.CREDIT_CARD,
  PAYMENT_METHOD.CASH,
  PAYMENT_METHOD.MANUAL_TRANSFER,
])

export const createPaymentSchema = z.object({ booking_id: idSchema }).strict()

export const createManualPaymentSchema = z
  .object({
    booking_id: idSchema,
    amount: money,
    method: z.enum([PAYMENT_METHOD.CASH, PAYMENT_METHOD.MANUAL_TRANSFER]),
    paid_at: z.string().datetime({ offset: true }).optional(),
    proof_media_id: idSchema.optional(),
  })
  .strict()

export const paymentsQuerySchema = offsetPaginationQuery.extend({
  status: status.optional(),
  method: method.optional(),
  paid_at_from: z.string().datetime({ offset: true }).optional(),
  paid_at_to: z.string().datetime({ offset: true }).optional(),
  provider_order_id: z.string().trim().min(1).max(160).optional(),
  q: z.string().trim().min(1).max(120).optional(),
})

export const simulateWebhookSchema = z
  .object({
    payment_id: idSchema,
    transaction_status: z
      .enum([
        'settlement',
        'capture',
        'pending',
        'deny',
        'cancel',
        'expire',
        'failure',
        'refund',
        'partial_refund',
      ])
      .default('settlement'),
    fraud_status: z.enum(['accept', 'challenge', 'deny']).optional(),
  })
  .strict()

export const paymentIdParam = idParam

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type CreateManualPaymentInput = z.infer<typeof createManualPaymentSchema>
export type PaymentsQuery = z.infer<typeof paymentsQuerySchema>
export type SimulateWebhookInput = z.infer<typeof simulateWebhookSchema>
