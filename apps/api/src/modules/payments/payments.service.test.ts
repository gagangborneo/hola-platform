import type { Quote } from '@hola/shared'
import { describe, expect, it } from 'vitest'
import { buildPaymentItems } from './payments.service.ts'

describe('item payment dari quote snapshot', () => {
  it('BR-P-16/BR-PR-55: diskon menjadi baris negatif dan jumlah item sama dengan gross amount', () => {
    const quote: Quote = {
      kind: 'booking',
      computed_at: '2026-08-01T00:00:00.000Z',
      pipeline_version: 1,
      lines: [
        {
          type: 'slot',
          ref_id: 'court-1',
          label: 'Court 1',
          quantity: 1,
          unit_price_amount: 150_000,
          line_total_amount: 150_000,
        },
      ],
      subtotal_amount: 150_000,
      addon_amount: 0,
      tier_discount_amount: 0,
      promo: null,
      discount_amount: 25_000,
      taxable_base_amount: 125_000,
      tax_rate: 0,
      tax_amount: 0,
      fee_amount: 0,
      rounding_adjustment_amount: 0,
      total_amount: 125_000,
      currency: 'IDR',
      warnings: [],
    }
    const items = buildPaymentItems(quote)
    expect(items).toContainEqual({ id: 'discount', name: 'Diskon', price: -25_000, quantity: 1 })
    expect(items.reduce((sum, item) => sum + item.price * item.quantity, 0)).toBe(125_000)
  })
})
