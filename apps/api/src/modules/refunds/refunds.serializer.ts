import type { UserRole } from '@hola/shared'
import type { RefundRow } from './refunds.repository.ts'

export function serializeRefund(refund: RefundRow, role: UserRole): Record<string, unknown> {
  return {
    id: refund.id,
    refund_code: refund.refundCode,
    payment_id: refund.paymentId,
    amount: refund.amount,
    status: refund.status,
    channel: refund.channel,
    reason: refund.reason,
    policy_applied: refund.policyApplied,
    requested_by_user_id: refund.requestedByUserId,
    approved_by_user_id: refund.approvedByUserId,
    approved_at: refund.approvedAt?.toISOString() ?? null,
    completed_at: refund.completedAt?.toISOString() ?? null,
    failure_reason: refund.failureReason,
    ...(role === 'admin'
      ? {
          destination_bank_name: refund.destinationBankName,
          destination_account_number: refund.destinationAccountNumber,
          destination_account_name: refund.destinationAccountName,
          provider_meta: refund.providerMeta,
        }
      : {}),
    created_at: refund.createdAt.toISOString(),
    updated_at: refund.updatedAt.toISOString(),
  }
}
