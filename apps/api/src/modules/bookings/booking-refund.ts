/** Perhitungan refund murni sesuai D-01; tidak membaca setting atau waktu sendiri. */

export type RefundPolicy = 'option_a' | 'option_b' | 'option_c'

export interface RefundBooking {
  totalAmount: number
  startsAt: Date
  gatewayFeeAmount: number
}

export interface RefundComputation {
  amount: number
  percentage: 0 | 50 | 100
  policyApplied: string
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

/**
 * [D-01] default sementara — lihat docs/00-OVERVIEW.md § 6.
 *
 * Option B: >48 jam penuh dikurangi fee gateway; 24–48 jam 50%; kurang dari
 * 24 jam 0. Option C hanya menyatakan nominal kredit; wallet tetap di luar v1.
 */
export function computeRefundAmount(
  booking: RefundBooking,
  policy: RefundPolicy,
  now: Date,
): RefundComputation {
  if (
    !isNonNegativeInteger(booking.totalAmount) ||
    !isNonNegativeInteger(booking.gatewayFeeAmount)
  ) {
    throw new Error('Nilai booking dan biaya gateway harus berupa rupiah bulat non-negatif.')
  }
  const hoursUntilStart = (booking.startsAt.getTime() - now.getTime()) / 3_600_000
  if (!Number.isFinite(hoursUntilStart)) throw new Error('startsAt atau now tidak valid.')

  if (policy === 'option_a')
    return { amount: 0, percentage: 0, policyApplied: 'option_a_no_refund' }
  if (policy === 'option_c') {
    return { amount: booking.totalAmount, percentage: 100, policyApplied: 'option_c_wallet_credit' }
  }
  if (hoursUntilStart > 48) {
    return {
      amount: Math.max(0, booking.totalAmount - booking.gatewayFeeAmount),
      percentage: 100,
      policyApplied: 'option_b_100_percent_minus_gateway_fee',
    }
  }
  if (hoursUntilStart >= 24) {
    return {
      amount: Math.floor(booking.totalAmount / 2),
      percentage: 50,
      policyApplied: 'option_b_50_percent',
    }
  }
  return { amount: 0, percentage: 0, policyApplied: 'option_b_no_refund_under_24h' }
}
