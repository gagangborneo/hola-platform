import { createHash, timingSafeEqual } from 'node:crypto'
import { ERROR_CODE, PAYMENT_METHOD, type PaymentMethod } from '@hola/shared'
import { z } from 'zod'
import { err } from '../../lib/errors.ts'
import type {
  CreateProviderTransactionInput,
  CreateRefundInput,
  ParsedProviderWebhook,
  PaymentProvider,
  PaymentProviderCapabilities,
  ProviderTransactionStatus,
} from './payment-provider.ts'
import {
  ProviderTransactionNotFoundError,
  UnsupportedPaymentOperationError,
} from './payment-provider.ts'

const snapResponseSchema = z.object({ token: z.string().min(1), redirect_url: z.url() })
const midtransPayloadSchema = z
  .object({
    order_id: z.string().min(1),
    transaction_status: z.string().min(1),
    status_code: z.string().min(1),
    gross_amount: z.string().min(1),
    transaction_time: z.string().min(1),
    transaction_id: z.string().optional(),
    payment_type: z.string().optional(),
    fraud_status: z.string().optional(),
    signature_key: z.string().optional(),
  })
  .passthrough()

type MidtransProviderConfig = {
  serverKey: string
  isProduction: boolean
  paymentExpiryMinutes: number
  refundApiSupportedMethods: readonly PaymentMethod[]
  fetcher?: typeof fetch
}

function basicAuth(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`, 'utf8').toString('base64')}`
}

function parseAmount(value: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw err.of(ERROR_CODE.PAYMENT_AMOUNT_MISMATCH)
  const amount = Number(value)
  if (!Number.isSafeInteger(amount)) throw err.of(ERROR_CODE.PAYMENT_AMOUNT_MISMATCH)
  return amount
}

function paymentMethod(value: string | undefined): PaymentMethod | null {
  if (value === 'qris') return PAYMENT_METHOD.QRIS
  if (value === 'gopay' || value === 'gopay_tokenization') return PAYMENT_METHOD.GOPAY
  if (value === 'shopeepay') return PAYMENT_METHOD.SHOPEEPAY
  if (value === 'credit_card') return PAYMENT_METHOD.CREDIT_CARD
  if (value === 'bank_transfer' || value === 'echannel' || value === 'permata') {
    return PAYMENT_METHOD.BANK_TRANSFER_VA
  }
  return null
}

function paidAt(value: string, status: string): Date | null {
  if (status !== 'settlement' && status !== 'capture') return null
  const instant = new Date(`${value.replace(' ', 'T')}+07:00`)
  return Number.isNaN(instant.getTime()) ? null : instant
}

function sanitizeRaw(value: Record<string, unknown>): Record<string, unknown> {
  const { signature_key: _signatureKey, ...safe } = value
  return safe
}

function parsedStatus(payload: z.infer<typeof midtransPayloadSchema>): ProviderTransactionStatus {
  return {
    status: payload.transaction_status,
    fraud_status: payload.fraud_status,
    method: paymentMethod(payload.payment_type),
    provider_transaction_id: payload.transaction_id ?? null,
    paid_at: paidAt(payload.transaction_time, payload.transaction_status),
    gross_amount: parseAmount(payload.gross_amount),
    raw: sanitizeRaw(payload),
  }
}

export function readStoredMidtransPayload(raw: unknown): ProviderTransactionStatus & {
  provider_order_id: string
} {
  const parsed = midtransPayloadSchema.safeParse(raw)
  if (!parsed.success) throw err.validation(parsed.error.issues, 'Payload Midtrans tidak valid.')
  return { ...parsedStatus(parsed.data), provider_order_id: parsed.data.order_id }
}

/** Format wajib Midtrans: YYYY-MM-DD HH:mm:ss +0700. */
function formatJakarta(instant: Date): string {
  return `${new Date(instant.getTime() + 7 * 60 * 60_000).toISOString().slice(0, 19).replace('T', ' ')} +0700`
}

export class MidtransProvider implements PaymentProvider {
  private readonly fetcher: typeof fetch
  private readonly apiBase: string
  private readonly snapBase: string
  private readonly config: MidtransProviderConfig

  constructor(config: MidtransProviderConfig) {
    this.config = config
    this.fetcher = config.fetcher ?? fetch
    this.apiBase = config.isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com'
    this.snapBase = config.isProduction
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com'
  }

  private async request(url: string, init: RequestInit): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetcher(url, {
        ...init,
        headers: {
          accept: 'application/json',
          authorization: basicAuth(this.config.serverKey),
          'content-type': 'application/json',
          ...init.headers,
        },
        signal: AbortSignal.timeout(10_000),
      })
    } catch (error) {
      throw err.upstream('Midtrans tidak dapat dihubungi.', error)
    }
    if (response.status === 404) throw new ProviderTransactionNotFoundError()
    if (!response.ok) throw err.upstream(`Midtrans mengembalikan HTTP ${response.status}.`)
    try {
      return await response.json()
    } catch (error) {
      throw err.upstream('Response Midtrans tidak dapat dibaca.', error)
    }
  }

  async createTransaction(input: CreateProviderTransactionInput): Promise<{
    provider_order_id: string
    provider_token: string
    redirect_url: string
    expires_at: Date
  }> {
    const startTime = new Date(
      input.expires_at.getTime() - this.config.paymentExpiryMinutes * 60_000,
    )
    const raw = await this.request(`${this.snapBase}/snap/v1/transactions`, {
      method: 'POST',
      body: JSON.stringify({
        transaction_details: { order_id: input.payment_code, gross_amount: input.amount },
        item_details: input.items.map((item) => ({
          id: item.id.slice(0, 50),
          name: item.name.slice(0, 50),
          price: item.price,
          quantity: item.quantity,
        })),
        customer_details: {
          first_name: input.customer.name.slice(0, 255),
          ...(input.customer.email ? { email: input.customer.email } : {}),
          ...(input.customer.phone ? { phone: input.customer.phone } : {}),
        },
        callbacks: input.callback_urls,
        expiry: {
          start_time: formatJakarta(startTime),
          unit: 'minutes',
          duration: this.config.paymentExpiryMinutes,
        },
      }),
    })
    const parsed = snapResponseSchema.safeParse(raw)
    if (!parsed.success) throw err.upstream('Response pembuatan transaksi Midtrans tidak valid.')
    return {
      provider_order_id: input.payment_code,
      provider_token: parsed.data.token,
      redirect_url: parsed.data.redirect_url,
      expires_at: input.expires_at,
    }
  }

  async getTransactionStatus(input: {
    provider_order_id: string
  }): Promise<ProviderTransactionStatus> {
    const raw = await this.request(
      `${this.apiBase}/v2/${encodeURIComponent(input.provider_order_id)}/status`,
      { method: 'GET' },
    )
    const parsed = midtransPayloadSchema.safeParse(raw)
    if (!parsed.success) throw err.upstream('Response status Midtrans tidak valid.')
    return parsedStatus(parsed.data)
  }

  parseWebhook(input: {
    headers: Readonly<Record<string, string | undefined>>
    rawBody: string
  }): ParsedProviderWebhook {
    let raw: unknown
    try {
      raw = JSON.parse(input.rawBody)
    } catch {
      throw err.validation(undefined, 'Payload webhook tidak valid.')
    }
    const parsed = midtransPayloadSchema.safeParse(raw)
    if (!parsed.success) throw err.validation(parsed.error.issues, 'Payload webhook tidak valid.')
    const payload = parsed.data
    const expected = createHash('sha512')
      .update(
        `${payload.order_id}${payload.status_code}${payload.gross_amount}${this.config.serverKey}`,
      )
      .digest()
    const supplied = /^[a-fA-F0-9]{128}$/.test(payload.signature_key ?? '')
      ? Buffer.from(payload.signature_key ?? '', 'hex')
      : Buffer.alloc(0)
    const valid = supplied.length === expected.length && timingSafeEqual(expected, supplied)
    return {
      ...parsedStatus(payload),
      is_signature_valid: valid,
      provider_event_id: `${payload.order_id}:${payload.transaction_status}:${payload.status_code}:${payload.transaction_time}`,
      provider_order_id: payload.order_id,
    }
  }

  async createRefund(_input: CreateRefundInput): Promise<never> {
    // ROADMAP A-4/K-10: API refund gateway sengaja ditunda; P1.I memakai jalur manual.
    throw new UnsupportedPaymentOperationError('createRefund')
  }

  capabilities(): PaymentProviderCapabilities {
    const supported = new Set(this.config.refundApiSupportedMethods)
    return {
      supports_api_refund_by_method: {
        qris: supported.has(PAYMENT_METHOD.QRIS),
        gopay: supported.has(PAYMENT_METHOD.GOPAY),
        shopeepay: supported.has(PAYMENT_METHOD.SHOPEEPAY),
        bank_transfer_va: supported.has(PAYMENT_METHOD.BANK_TRANSFER_VA),
        credit_card: supported.has(PAYMENT_METHOD.CREDIT_CARD),
        cash: false,
        manual_transfer: false,
      },
    }
  }
}
