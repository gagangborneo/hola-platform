import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { MidtransProvider } from './midtrans-provider.ts'

function provider(fetcher: typeof fetch = vi.fn<typeof fetch>()): MidtransProvider {
  return new MidtransProvider({
    serverKey: 'server-key',
    isProduction: false,
    paymentExpiryMinutes: 15,
    refundApiSupportedMethods: ['credit_card', 'gopay'],
    fetcher,
  })
}

function webhook(signature: string): string {
  return JSON.stringify({
    order_id: 'HP-260801-0001',
    transaction_status: 'settlement',
    status_code: '200',
    gross_amount: '575000.00',
    transaction_time: '2026-08-01 12:00:00',
    transaction_id: 'midtrans-1',
    payment_type: 'qris',
    signature_key: signature,
  })
}

describe('P1-48 MidtransProvider', () => {
  it('BR-P-37: memverifikasi signature SHA-512 memakai gross_amount apa adanya', () => {
    const signature = createHash('sha512')
      .update('HP-260801-0001200575000.00server-key')
      .digest('hex')
    const parsed = provider().parseWebhook({ headers: {}, rawBody: webhook(signature) })
    expect(parsed).toMatchObject({
      is_signature_valid: true,
      gross_amount: 575_000,
      provider_order_id: 'HP-260801-0001',
      method: 'qris',
    })
    expect(parsed.raw).not.toHaveProperty('signature_key')
  })

  it('BR-P-37: signature salah ditolak secara konstan tanpa exception pembanding panjang', () => {
    const parsed = provider().parseWebhook({ headers: {}, rawBody: webhook('tidak-valid') })
    expect(parsed.is_signature_valid).toBe(false)
  })

  it('createTransaction mengirim Snap sandbox, discount negatif, dan expiry 15 menit', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: 'snap-secret-token',
          redirect_url: 'https://app.sandbox.midtrans.com/snap/v4/redirection/x',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    const expiresAt = new Date('2026-08-01T00:15:00Z')
    const result = await provider(fetcher).createTransaction({
      payment_code: 'HP-260801-0001',
      amount: 575_000,
      items: [
        { id: 'slot', name: 'Lapangan', price: 625_000, quantity: 1 },
        { id: 'discount', name: 'Promo', price: -50_000, quantity: 1 },
      ],
      customer: { name: 'Customer', email: 'customer@example.test' },
      expires_at: expiresAt,
      callback_urls: { finish: 'https://hola.test/paid', error: 'https://hola.test/error' },
    })
    expect(result).toMatchObject({ provider_token: 'snap-secret-token', expires_at: expiresAt })
    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(url).toBe('https://app.sandbox.midtrans.com/snap/v1/transactions')
    const body = JSON.parse(String(init?.body))
    expect(body.item_details[1].price).toBe(-50_000)
    expect(body.expiry).toMatchObject({ duration: 15, unit: 'minutes' })
  })

  it('capabilities berasal dari setting metode yang diberikan', () => {
    expect(provider().capabilities().supports_api_refund_by_method).toMatchObject({
      credit_card: true,
      gopay: true,
      bank_transfer_va: false,
      cash: false,
    })
  })
})
