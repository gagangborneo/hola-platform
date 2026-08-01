import type { UserRole } from '@hola/shared'
import type { PaymentRow } from './payments.repository.ts'

export function serializePayment(payment: PaymentRow, role: UserRole, detail = false) {
  const admin = role === 'admin'
  return {
    id: payment.id,
    payment_code: payment.paymentCode,
    provider: payment.provider,
    booking_id: payment.bookingId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    refund_status: payment.refundStatus,
    refunded_amount: payment.refundedAmount,
    provider_order_id: payment.providerOrderId,
    provider_transaction_id: payment.providerTransactionId,
    ...(detail
      ? {
          snap_token: payment.snapToken,
          snap_redirect_url: payment.snapRedirectUrl,
        }
      : {}),
    expires_at: payment.expiresAt?.toISOString() ?? null,
    paid_at: payment.paidAt?.toISOString() ?? null,
    failed_at: payment.failedAt?.toISOString() ?? null,
    failure_reason: payment.failureReason,
    needs_manual_review: payment.needsManualReview,
    ...(admin
      ? {
          gateway_fee_amount: payment.gatewayFeeAmount,
          settled_amount: payment.settledAmount,
          provider_meta: payment.providerMeta,
        }
      : {}),
    created_at: payment.createdAt.toISOString(),
    updated_at: payment.updatedAt.toISOString(),
  }
}
