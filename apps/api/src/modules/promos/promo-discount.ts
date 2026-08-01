/** Perhitungan diskon promo murni. Total transaksi tetap dihitung modul pricing. */
import { roundTo100 } from '@hola/shared'

export type DiscountPromo =
  | { type: 'percent'; valuePercent: number; maxDiscountAmount: number | null }
  | { type: 'fixed'; valueAmount: number }
  | { type: 'free_slot'; freeSlotCount: number }

export type DiscountLine = {
  type: string
  unit_price_amount: number
  starts_at?: string | undefined
}

/**
 * BR-PR-01/02/05/06: hitung diskon dasar, bulatkan ke Rp100, lalu clamp ke
 * nilai transaksi. Money di aplikasi adalah integer rupiah sehingga fungsi ini
 * mengembalikan `number`, sesuai kontrak TypeScript repository.
 */
export function computeDiscount(
  promo: DiscountPromo,
  baseAmount: number,
  lines: readonly DiscountLine[] = [],
): number {
  if (!Number.isFinite(baseAmount) || baseAmount < 0) {
    throw new Error('baseAmount harus berupa rupiah non-negatif yang berhingga')
  }

  let rawAmount: number
  if (promo.type === 'percent') {
    rawAmount = Math.min(
      baseAmount * (promo.valuePercent / 100),
      promo.maxDiscountAmount ?? Number.POSITIVE_INFINITY,
    )
  } else if (promo.type === 'fixed') {
    rawAmount = promo.valueAmount
  } else {
    rawAmount = [...lines]
      .filter((line) => line.type === 'slot')
      .sort(
        (left, right) =>
          left.unit_price_amount - right.unit_price_amount ||
          (left.starts_at ?? '').localeCompare(right.starts_at ?? ''),
      )
      .slice(0, promo.freeSlotCount)
      .reduce((sum, line) => sum + line.unit_price_amount, 0)
  }

  return Math.max(0, Math.min(roundTo100(rawAmount), baseAmount))
}
