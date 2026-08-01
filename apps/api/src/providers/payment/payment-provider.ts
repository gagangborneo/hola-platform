import type { PaymentMethod, PaymentStatus } from '@hola/shared'

export type ProviderItem = { id: string; name: string; price: number; quantity: number }
export type ProviderCustomer = { name: string; email?: string; phone?: string }

export type CreateProviderTransactionInput = {
  payment_code: string
  amount: number
  items: readonly ProviderItem[]
  customer: ProviderCustomer
  expires_at: Date
  callback_urls: { finish: string; error: string }
}

export type ProviderTransactionStatus = {
  status: string
  fraud_status?: string | undefined
  method: PaymentMethod | null
  provider_transaction_id: string | null
  paid_at: Date | null
  gross_amount: number
  raw: Record<string, unknown>
}

export type ParsedProviderWebhook = ProviderTransactionStatus & {
  is_signature_valid: boolean
  provider_event_id: string
  provider_order_id: string
}

export type PaymentProviderCapabilities = {
  supports_api_refund_by_method: Record<PaymentMethod, boolean>
}

export type CreateRefundInput = {
  payment: { provider_order_id: string; method: PaymentMethod | null }
  amount: number
  reason: string
  refund_reference: string
}

export interface PaymentProvider {
  createTransaction(input: CreateProviderTransactionInput): Promise<{
    provider_order_id: string
    provider_token: string
    redirect_url: string
    expires_at: Date
  }>
  getTransactionStatus(input: { provider_order_id: string }): Promise<ProviderTransactionStatus>
  parseWebhook(input: {
    headers: Readonly<Record<string, string | undefined>>
    rawBody: string
  }): ParsedProviderWebhook
  createRefund(input: CreateRefundInput): Promise<{
    provider_refund_id: string
    status: string
    raw: Record<string, unknown>
  }>
  capabilities(): PaymentProviderCapabilities
}

export class UnsupportedPaymentOperationError extends Error {
  constructor(operation: string) {
    super(`Provider tidak mendukung operasi ${operation}`)
    this.name = 'UnsupportedPaymentOperationError'
  }
}

export type PaymentTransitionInput = {
  status: PaymentStatus
  needsManualReview: boolean
  failureReason: string | null
}
