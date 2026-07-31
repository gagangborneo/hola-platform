import { describe, expect, it } from 'vitest'
import { computeRefundAmount } from './booking-refund.ts'

const now = new Date('2026-07-31T00:00:00.000Z')
const booking = { totalAmount: 500_000, gatewayFeeAmount: 3_500 }

describe('P1-33 / D-01: computeRefundAmount', () => {
  it.each([
    ['lebih dari 48 jam', '2026-08-02T01:00:00.000Z', 496_500, 100],
    ['tepat tier 24–48 jam', '2026-08-01T12:00:00.000Z', 250_000, 50],
    ['kurang dari 24 jam', '2026-07-31T23:59:59.000Z', 0, 0],
  ] as const)('Opsi B %s', (_name, startsAt, amount, percentage) => {
    expect(
      computeRefundAmount({ ...booking, startsAt: new Date(startsAt) }, 'option_b', now),
    ).toMatchObject({ amount, percentage })
  })

  it('Opsi A tidak mengembalikan dana dan Opsi C menyatakan kredit penuh', () => {
    const startsAt = new Date('2026-08-02T00:00:00.000Z')
    expect(computeRefundAmount({ ...booking, startsAt }, 'option_a', now).amount).toBe(0)
    expect(computeRefundAmount({ ...booking, startsAt }, 'option_c', now)).toMatchObject({
      amount: 500_000,
      percentage: 100,
    })
  })
})
