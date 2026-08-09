/**
 * Periode yang bisa dipilih di baris filter, beserta pembandingnya.
 *
 * Setiap periode membawa pembandingnya sendiri dengan panjang yang sama —
 * membandingkan satu bulan dengan tiga bulan akan membuat setiap delta di
 * dashboard salah tanpa ada yang terlihat salah.
 */
import type { DailyPoint, MonthSeries, MonthTotals } from './series.ts'
import { generateMonth, shortMonthLabel, totalsOf } from './series.ts'

export type PeriodKey = 'current' | 'previous' | 'quarter'

export const PERIOD_OPTIONS: readonly { key: PeriodKey; label: string }[] = [
  { key: 'current', label: 'Bulan ini · Agustus 2026' },
  { key: 'previous', label: 'Bulan lalu · Juli 2026' },
  { key: 'quarter', label: '3 bulan terakhir · Jun–Agu 2026' },
]

/**
 * Enam bulan berturut-turut dengan skala yang menanjak — cukup untuk mengisi
 * tren jangka menengah di panel keuangan sekaligus menyediakan pembanding
 * kuartal. Seed berbeda per bulan supaya bentuk hariannya tidak berulang persis.
 */
const MONTHS: readonly MonthSeries[] = [
  generateMonth(2026, 3, { scale: 0.72, seed: 202_603 }),
  generateMonth(2026, 4, { scale: 0.79, seed: 202_604 }),
  generateMonth(2026, 5, { scale: 0.86, seed: 202_605 }),
  generateMonth(2026, 6, { scale: 0.9, seed: 202_606 }),
  generateMonth(2026, 7, { scale: 0.94, seed: 202_607 }),
  generateMonth(2026, 8, { scale: 1, seed: 202_608 }),
]

const byMonth = (month: number): MonthSeries => {
  const found = MONTHS.find((entry) => entry.month === month)
  if (found === undefined) throw new Error(`Bulan demo ${month} tidak dibangkitkan`)
  return found
}

export const MONTH_SERIES = MONTHS
export const CURRENT_MONTH = byMonth(8)

export interface ResolvedPeriod {
  readonly comparisonLabel: string
  readonly comparisonTotals: MonthTotals
  readonly days: readonly DailyPoint[]
  /** Label sumbu-x; harian untuk satu bulan, tetap harian untuk kuartal (dijarangkan). */
  readonly labels: readonly string[]
  readonly key: PeriodKey
  readonly label: string
  /** Tiap berapa titik sebuah tick sumbu-x digambar. */
  readonly tickEvery: number
  readonly totals: MonthTotals
}

function joinDays(months: readonly MonthSeries[]): DailyPoint[] {
  return months.flatMap((entry) => [...entry.days])
}

function dayLabels(months: readonly MonthSeries[]): string[] {
  return months.flatMap((entry) =>
    entry.days.map((point) =>
      months.length === 1
        ? String(point.day)
        : `${point.day} ${shortMonthLabel(entry.month, entry.year).split(' ')[0] ?? ''}`,
    ),
  )
}

export function resolvePeriod(key: PeriodKey): ResolvedPeriod {
  if (key === 'previous') {
    const months = [byMonth(7)]
    return {
      comparisonLabel: 'dari Juni 2026',
      comparisonTotals: byMonth(6).totals,
      days: joinDays(months),
      key,
      label: 'Juli 2026',
      labels: dayLabels(months),
      tickEvery: 3,
      totals: byMonth(7).totals,
    }
  }

  if (key === 'quarter') {
    const months = [byMonth(6), byMonth(7), byMonth(8)]
    const comparison = [byMonth(3), byMonth(4), byMonth(5)]
    return {
      comparisonLabel: 'dari Mar–Mei 2026',
      comparisonTotals: totalsOf(joinDays(comparison)),
      days: joinDays(months),
      key,
      label: 'Juni – Agustus 2026',
      labels: dayLabels(months),
      tickEvery: 10,
      totals: totalsOf(joinDays(months)),
    }
  }

  const months = [byMonth(8)]
  return {
    comparisonLabel: 'dari Juli 2026',
    comparisonTotals: byMonth(7).totals,
    days: joinDays(months),
    key,
    label: 'Agustus 2026',
    labels: dayLabels(months),
    tickEvery: 3,
    totals: byMonth(8).totals,
  }
}

/**
 * Stempel waktu demo dibekukan, bukan diambil dari jam mesin: `new Date()` saat
 * render membuat markup server dan klien berbeda, dan React melaporkannya
 * sebagai hydration mismatch.
 */
export const DEMO_UPDATED_AT = '09 Agu 2026, 15.51 WITA'
