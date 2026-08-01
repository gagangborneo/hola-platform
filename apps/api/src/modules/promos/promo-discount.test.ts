import { describe, expect, it } from 'vitest'
import { computeDiscount } from './promo-discount.ts'

describe('computeDiscount', () => {
  it('BR-PR-01/T-PR-09: membatasi percent dengan max_discount_amount', () => {
    expect(
      computeDiscount({ type: 'percent', valuePercent: 20, maxDiscountAmount: 50_000 }, 625_000),
    ).toBe(50_000)
  })

  it('BR-PR-01: menghitung percent tanpa plafon', () => {
    expect(
      computeDiscount({ type: 'percent', valuePercent: 10, maxDiscountAmount: null }, 300_000),
    ).toBe(30_000)
  })

  it('BR-PR-02: menghitung fixed', () => {
    expect(computeDiscount({ type: 'fixed', valueAmount: 50_000 }, 300_000)).toBe(50_000)
  })

  it('BR-PR-02/BR-PR-20: clamp fixed ke base', () => {
    expect(computeDiscount({ type: 'fixed', valueAmount: 50_000 }, 40_000)).toBe(40_000)
  })

  it('BR-PR-04/T-PR-10: free_slot memilih slot termurah', () => {
    expect(
      computeDiscount({ type: 'free_slot', freeSlotCount: 1 }, 750_000, [
        { type: 'slot', unit_price_amount: 300_000, starts_at: '2026-08-01T02:00:00Z' },
        { type: 'slot', unit_price_amount: 150_000, starts_at: '2026-08-01T01:00:00Z' },
        { type: 'slot', unit_price_amount: 300_000, starts_at: '2026-08-01T00:00:00Z' },
      ]),
    ).toBe(150_000)
  })

  it('BR-PR-04: free_slot menjumlahkan jumlah slot gratis yang diminta', () => {
    expect(
      computeDiscount({ type: 'free_slot', freeSlotCount: 1 }, 900_000, [
        { type: 'slot', unit_price_amount: 300_000 },
        { type: 'slot', unit_price_amount: 300_000 },
        { type: 'slot', unit_price_amount: 300_000 },
      ]),
    ).toBe(300_000)
  })

  it('BR-PR-06: membulatkan half-up ke Rp100', () => {
    expect(
      computeDiscount({ type: 'percent', valuePercent: 33, maxDiscountAmount: null }, 155_000),
    ).toBe(51_200)
  })
})
