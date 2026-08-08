import { describe, expect, it } from 'vitest'
import { buildCancellationPreview } from './booking-refund.ts'

const now = new Date('2026-08-08T02:00:00.000Z')
const startsAtFar = new Date('2026-08-11T02:00:00.000Z')
const startsAtSoon = new Date('2026-08-08T12:00:00.000Z')

describe('pratinjau pembatalan sebelum konfirmasi', () => {
  it('P1-78: booking confirmed >48 jam mengembalikan nominal dikurangi fee gateway', () => {
    const preview = buildCancellationPreview({
      status: 'confirmed',
      payment: { amount: 300_000, gatewayFeeAmount: 5_000 },
      startsAt: startsAtFar,
      policy: 'option_b',
      now,
    })

    expect(preview).toEqual({
      isCancellable: true,
      refundEstimateAmount: 295_000,
      policyApplied: 'option_b_100_percent_minus_gateway_fee',
    })
  })

  it('P1-78 / BR-B-63: <24 jam tetap cancellable tapi refund nol dengan kebijakan jelas', () => {
    const preview = buildCancellationPreview({
      status: 'confirmed',
      payment: { amount: 300_000, gatewayFeeAmount: 5_000 },
      startsAt: startsAtSoon,
      policy: 'option_b',
      now,
    })

    expect(preview.isCancellable).toBe(true)
    expect(preview.refundEstimateAmount).toBe(0)
    expect(preview.policyApplied).toBe('option_b_no_refund_under_24h')
  })

  it('P1-78: pending_payment belum berbayar sehingga tidak ada refund', () => {
    const preview = buildCancellationPreview({
      status: 'pending_payment',
      payment: null,
      startsAt: startsAtFar,
      policy: 'option_b',
      now,
    })

    expect(preview).toEqual({
      isCancellable: true,
      refundEstimateAmount: 0,
      policyApplied: 'pending_payment_no_refund',
    })
  })

  it('P1-78: status selain pending_payment/confirmed tidak dapat dibatalkan', () => {
    for (const status of ['completed', 'cancelled', 'expired', 'no_show'] as const) {
      const preview = buildCancellationPreview({
        status,
        payment: null,
        startsAt: startsAtFar,
        policy: 'option_b',
        now,
      })

      expect(preview.isCancellable).toBe(false)
      expect(preview.refundEstimateAmount).toBe(0)
      expect(preview.policyApplied).toBe('not_cancellable')
    }
  })
})
