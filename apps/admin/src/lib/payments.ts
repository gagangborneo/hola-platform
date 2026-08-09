/**
 * Bentuk pembayaran dan refund untuk dashboard hari ini, detail booking, dan
 * ruang kerja pembayaran.
 */
import { isRecord } from './api-response.ts'

export type PaymentStatusValue = 'pending' | 'paid' | 'expired' | 'failed' | 'cancelled'

export interface Payment {
  amount: number
  bookingId: string
  createdAt: string
  expiresAt: string | null
  failureReason: string | null
  id: string
  method: string
  needsManualReview: boolean
  paidAt: string | null
  paymentCode: string
  provider: string
  providerOrderId: string | null
  refundStatus: string
  refundedAmount: number
  status: PaymentStatusValue
}

interface PaymentResponse {
  amount: number
  booking_id: string
  created_at: string
  expires_at: string | null
  failure_reason: string | null
  id: string
  method: string
  needs_manual_review: boolean
  paid_at: string | null
  payment_code: string
  provider: string
  provider_order_id: string | null
  refund_status: string
  refunded_amount: number
  status: PaymentStatusValue
}

const PAYMENT_STATUSES: readonly string[] = ['pending', 'paid', 'expired', 'failed', 'cancelled']

function isPaymentStatus(value: unknown): value is PaymentStatusValue {
  return typeof value === 'string' && PAYMENT_STATUSES.includes(value)
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

export function isPaymentResponse(value: unknown): value is PaymentResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.payment_code === 'string' &&
    typeof value.provider === 'string' &&
    typeof value.booking_id === 'string' &&
    typeof value.amount === 'number' &&
    typeof value.method === 'string' &&
    typeof value.refund_status === 'string' &&
    typeof value.refunded_amount === 'number' &&
    typeof value.needs_manual_review === 'boolean' &&
    typeof value.created_at === 'string' &&
    isPaymentStatus(value.status) &&
    isNullableString(value.provider_order_id) &&
    isNullableString(value.expires_at) &&
    isNullableString(value.paid_at) &&
    isNullableString(value.failure_reason)
  )
}

export function normalizePayment(value: PaymentResponse): Payment {
  return {
    id: value.id,
    paymentCode: value.payment_code,
    provider: value.provider,
    bookingId: value.booking_id,
    amount: value.amount,
    method: value.method,
    status: value.status,
    refundStatus: value.refund_status,
    refundedAmount: value.refunded_amount,
    providerOrderId: value.provider_order_id,
    expiresAt: value.expires_at,
    paidAt: value.paid_at,
    failureReason: value.failure_reason,
    needsManualReview: value.needs_manual_review,
    createdAt: value.created_at,
  }
}

export type RefundStatusValue =
  | 'requested'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'failed'

export interface Refund {
  amount: number
  approvedAt: string | null
  channel: string
  completedAt: string | null
  createdAt: string
  destinationAccountName: string | null
  destinationAccountNumber: string | null
  destinationBankName: string | null
  failureReason: string | null
  id: string
  paymentId: string
  policyApplied: string | null
  reason: string
  refundCode: string
  status: RefundStatusValue
}

interface RefundResponse {
  amount: number
  approved_at: string | null
  channel: string
  completed_at: string | null
  created_at: string
  destination_account_name?: string | null
  destination_account_number?: string | null
  destination_bank_name?: string | null
  failure_reason: string | null
  id: string
  payment_id: string
  policy_applied: string | null
  reason: string
  refund_code: string
  status: RefundStatusValue
}

const REFUND_STATUSES: readonly string[] = [
  'requested',
  'approved',
  'processing',
  'completed',
  'rejected',
  'failed',
]

function isRefundStatus(value: unknown): value is RefundStatusValue {
  return typeof value === 'string' && REFUND_STATUSES.includes(value)
}

export function isRefundResponse(value: unknown): value is RefundResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.refund_code === 'string' &&
    typeof value.payment_id === 'string' &&
    typeof value.amount === 'number' &&
    typeof value.channel === 'string' &&
    typeof value.reason === 'string' &&
    typeof value.created_at === 'string' &&
    isRefundStatus(value.status) &&
    isNullableString(value.policy_applied) &&
    isNullableString(value.approved_at) &&
    isNullableString(value.completed_at) &&
    isNullableString(value.failure_reason)
  )
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function normalizeRefund(value: RefundResponse): Refund {
  return {
    id: value.id,
    refundCode: value.refund_code,
    paymentId: value.payment_id,
    amount: value.amount,
    status: value.status,
    channel: value.channel,
    reason: value.reason,
    policyApplied: value.policy_applied,
    approvedAt: value.approved_at,
    completedAt: value.completed_at,
    failureReason: value.failure_reason,
    destinationBankName: optionalString(value.destination_bank_name),
    destinationAccountNumber: optionalString(value.destination_account_number),
    destinationAccountName: optionalString(value.destination_account_name),
    createdAt: value.created_at,
  }
}
