/**
 * Tambahan khusus dashboard keuangan.
 *
 * Laba rugi, arus kas, dan neraca dipakai bersama dengan dashboard eksekutif
 * lewat `buildExecutiveReport` — sengaja tidak dihitung ulang di sini, karena
 * dua rumus untuk satu laporan adalah cara paling mudah membuat dua halaman
 * melaporkan laba bersih yang berbeda.
 */
import type { ExecutiveReport } from './executive.ts'

export interface FinanceExtras {
  readonly discountRecap: readonly { key: string; label: string; value: number; detail: string }[]
  readonly paymentMethods: readonly { key: string; label: string; value: number; detail: string }[]
  readonly tenantAging: readonly { key: string; label: string; value: number; detail: string }[]
}

const PAYMENT_METHOD_SHARES: readonly { key: string; label: string; share: number }[] = [
  { key: 'qris', label: 'QRIS', share: 0.34 },
  { key: 'bank_transfer_va', label: 'Transfer VA', share: 0.25 },
  { key: 'gopay', label: 'GoPay', share: 0.14 },
  { key: 'shopeepay', label: 'ShopeePay', share: 0.09 },
  { key: 'cash', label: 'Tunai di venue', share: 0.13 },
  { key: 'manual_transfer', label: 'Transfer manual', share: 0.05 },
]

/** Aging piutang tenant mengikuti ember laporan R-5 (docs/14 § 7). */
const AGING_BUCKETS: readonly { key: string; label: string; share: number }[] = [
  { key: 'current', label: 'Belum jatuh tempo', share: 0.52 },
  { key: '1-30', label: 'Terlambat 1–30 hari', share: 0.27 },
  { key: '31-60', label: 'Terlambat 31–60 hari', share: 0.14 },
  { key: '60+', label: 'Terlambat di atas 60 hari', share: 0.07 },
]

const DISCOUNT_SHARES: readonly { key: string; label: string; share: number }[] = [
  { key: 'voucher', label: 'Voucher promo', share: 0.44 },
  { key: 'member', label: 'Diskon member', share: 0.29 },
  { key: 'bundle', label: 'Paket multi-slot', share: 0.18 },
  { key: 'manual', label: 'Penyesuaian manual', share: 0.09 },
]

export function buildFinanceExtras(
  report: ExecutiveReport,
  tenantReceivable: number,
): FinanceExtras {
  const paid = report.summary.totalRevenue
  const discounts = Math.abs(report.profitLoss.find((row) => row.key === 'discount')?.current ?? 0)

  return {
    discountRecap: DISCOUNT_SHARES.map((entry) => ({
      detail: `${Math.round(entry.share * 100)}% dari total diskon`,
      key: entry.key,
      label: entry.label,
      value: Math.round(discounts * entry.share),
    })),
    paymentMethods: PAYMENT_METHOD_SHARES.map((entry) => ({
      detail: `${Math.round(entry.share * 100)}% dari nilai transaksi`,
      key: entry.key,
      label: entry.label,
      value: Math.round(paid * entry.share),
    })),
    tenantAging: AGING_BUCKETS.map((entry) => ({
      detail: `${Math.round(entry.share * 100)}% dari piutang`,
      key: entry.key,
      label: entry.label,
      value: Math.round(tenantReceivable * entry.share),
    })),
  }
}
