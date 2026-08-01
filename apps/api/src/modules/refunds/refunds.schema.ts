import {
  idParam,
  idSchema,
  money,
  offsetPaginationQuery,
  REFUND_CHANNEL,
  REFUND_STATUS,
} from '@hola/shared'
import { z } from 'zod'

export const refundsQuerySchema = offsetPaginationQuery.extend({
  status: z
    .enum([
      REFUND_STATUS.REQUESTED,
      REFUND_STATUS.APPROVED,
      REFUND_STATUS.PROCESSING,
      REFUND_STATUS.COMPLETED,
      REFUND_STATUS.REJECTED,
      REFUND_STATUS.FAILED,
    ])
    .optional(),
  payment_id: idSchema.optional(),
})

export const createRefundSchema = z
  .object({
    payment_id: idSchema,
    amount: money.refine((value) => value > 0),
    reason: z.string().trim().min(1).max(1_000),
    channel: z.enum([REFUND_CHANNEL.MANUAL_TRANSFER, REFUND_CHANNEL.CASH]),
    destination_bank_name: z.string().trim().min(1).max(120).optional(),
    destination_account_number: z.string().trim().min(1).max(100).optional(),
    destination_account_name: z.string().trim().min(1).max(160).optional(),
  })
  .strict()

export const rejectRefundSchema = z.object({ reason: z.string().trim().min(1).max(1_000) }).strict()

export const approveRefundSchema = z
  .object({
    destination_bank_name: z.string().trim().min(1).max(120).optional(),
    destination_account_number: z.string().trim().min(1).max(100).optional(),
    destination_account_name: z.string().trim().min(1).max(160).optional(),
  })
  .strict()
  .refine(
    (value) => {
      const supplied = [
        value.destination_bank_name,
        value.destination_account_number,
        value.destination_account_name,
      ]
      return supplied.every(Boolean) || supplied.every((item) => item === undefined)
    },
    {
      message: 'Seluruh field rekening tujuan harus diisi bersama.',
      path: ['destination_bank_name'],
    },
  )

export const markRefundCompletedSchema = z.object({ proof_media_id: idSchema.optional() }).strict()

export const refundIdParam = idParam

export type RefundsQuery = z.infer<typeof refundsQuerySchema>
export type CreateRefundInput = z.infer<typeof createRefundSchema>
export type ApproveRefundInput = z.infer<typeof approveRefundSchema>
export type RejectRefundInput = z.infer<typeof rejectRefundSchema>
export type MarkRefundCompletedInput = z.infer<typeof markRefundCompletedSchema>
