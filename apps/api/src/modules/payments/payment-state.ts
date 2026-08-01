/** State machine payment murni dan mapper status Midtrans. */
import type { PaymentStatus } from '@hola/shared'
import { err } from '../../lib/errors.ts'
import type { PaymentTransitionInput } from '../../providers/payment/payment-provider.ts'

export type PaymentTransition = PaymentTransitionInput & { changed: boolean }

export function applyPaymentTransition(
  current: PaymentTransitionInput,
  next: PaymentTransitionInput,
  source: 'standard' | 'provider_settlement' = 'standard',
): PaymentTransition {
  if (current.status === next.status) return { ...next, changed: false }
  if (current.status === 'expired' && next.status === 'paid' && source === 'provider_settlement') {
    return { ...next, changed: true }
  }
  if (current.status !== 'pending') {
    throw err.conflict('Transisi status payment tidak diizinkan.', {
      from: current.status,
      to: next.status,
    })
  }
  const allowed: readonly PaymentStatus[] = ['paid', 'expired', 'failed', 'cancelled']
  if (!allowed.includes(next.status)) {
    throw err.conflict('Transisi status payment tidak diizinkan.', {
      from: current.status,
      to: next.status,
    })
  }
  return { ...next, changed: true }
}

export function mapMidtransStatus(input: {
  transactionStatus: string
  fraudStatus?: string | undefined
}): PaymentTransitionInput & { refundStatus?: 'partial' | 'full' | undefined } {
  if (input.transactionStatus === 'settlement') {
    return { status: 'paid', needsManualReview: false, failureReason: null }
  }
  if (input.transactionStatus === 'capture') {
    if (input.fraudStatus === 'accept') {
      return { status: 'paid', needsManualReview: false, failureReason: null }
    }
    if (input.fraudStatus === 'challenge') {
      return { status: 'pending', needsManualReview: true, failureReason: null }
    }
    if (input.fraudStatus === 'deny') {
      return { status: 'failed', needsManualReview: false, failureReason: 'fraud_deny' }
    }
    throw err.validation(
      { fraud_status: input.fraudStatus },
      'Fraud status Midtrans tidak dikenali.',
    )
  }
  if (input.transactionStatus === 'pending') {
    return { status: 'pending', needsManualReview: false, failureReason: null }
  }
  if (input.transactionStatus === 'deny' || input.transactionStatus === 'failure') {
    return { status: 'failed', needsManualReview: false, failureReason: input.transactionStatus }
  }
  if (input.transactionStatus === 'cancel') {
    return { status: 'cancelled', needsManualReview: false, failureReason: null }
  }
  if (input.transactionStatus === 'expire') {
    return { status: 'expired', needsManualReview: false, failureReason: null }
  }
  if (input.transactionStatus === 'refund') {
    return {
      status: 'paid',
      needsManualReview: false,
      failureReason: null,
      refundStatus: 'full',
    }
  }
  if (input.transactionStatus === 'partial_refund') {
    return {
      status: 'paid',
      needsManualReview: false,
      failureReason: null,
      refundStatus: 'partial',
    }
  }
  throw err.validation(
    { transaction_status: input.transactionStatus },
    'Status Midtrans tidak dikenali.',
  )
}
