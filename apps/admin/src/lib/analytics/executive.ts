/**
 * Laporan eksekutif demo.
 *
 * Seluruh angka turunan dihitung dari deret harian periode terpilih, bukan
 * ditulis sebagai konstanta terpisah. Itu bukan kerapian: dashboard yang total
 * kartunya tidak sama dengan jumlah batang grafiknya akan langsung dipertanyakan
 * saat presentasi, dan itu satu-satunya hal yang paling cepat dicek pembaca.
 *
 * Istilah keuangan mengikuti bagan akun minimal di docs/14 § 4 supaya nama baris
 * di sini sama dengan nama akun yang nanti benar-benar diposting jurnal.
 */

import { percentChange } from './format.ts'
import type { ResolvedPeriod } from './periods.ts'
import { MONTH_SERIES } from './periods.ts'
import type { MonthTotals } from './series.ts'
import { shortMonthLabel } from './series.ts'

export interface FunnelStageData {
  readonly key: string
  readonly label: string
  readonly value: number
}

export interface CourtPerformance {
  readonly bookings: number
  readonly code: string
  readonly name: string
  readonly occupancyRate: number
  readonly revenue: number
  readonly slots: number
  readonly sport: string
}

export interface DistributionItem {
  readonly detail?: string
  readonly key: string
  readonly label: string
  readonly value: number
}

export interface ProfitLossRow {
  readonly current: number
  readonly emphasis?: boolean
  readonly key: string
  readonly label: string
  readonly previous: number
}

export interface HealthIndicator {
  readonly key: string
  readonly label: string
  readonly tone: 'good' | 'warning' | 'serious' | 'critical'
  readonly toneLabel: string
  /** Hanya diisi kalau ada deret bulanan yang benar-benar mengukur indikator ini. */
  readonly trend?: readonly number[]
  readonly value: string
}

export interface TargetProgress {
  readonly caption: string
  readonly label: string
  readonly percent: number
}

export interface StatusBreakdown {
  readonly count: number
  readonly label: string
  readonly value: number
}

export interface StatusCard {
  readonly amount: number
  readonly breakdown: readonly StatusBreakdown[]
  readonly count: number
  readonly key: string
  readonly title: string
  readonly tone: 'accent' | 'good'
}

export interface ExecutiveReport {
  readonly balanceSheet: {
    readonly currentAssets: readonly StatusBreakdown[]
    readonly equity: readonly StatusBreakdown[]
    readonly fixedAssets: readonly StatusBreakdown[]
    readonly longTermLiabilities: readonly StatusBreakdown[]
    readonly shortTermLiabilities: readonly StatusBreakdown[]
    readonly totalAssets: number
    readonly totalEquity: number
    readonly totalLiabilities: number
  }
  readonly businessLines: readonly DistributionItem[]
  readonly cashFlow: {
    readonly inflow: readonly StatusBreakdown[]
    readonly net: number
    readonly outflow: readonly StatusBreakdown[]
    readonly totalInflow: number
    readonly totalOutflow: number
  }
  readonly channels: readonly DistributionItem[]
  readonly conversionSteps: readonly { key: string; label: string; rate: number }[]
  readonly courts: readonly CourtPerformance[]
  readonly financeTrend: {
    readonly cash: readonly number[]
    readonly labels: readonly string[]
  }
  readonly funnel: readonly FunnelStageData[]
  readonly health: readonly HealthIndicator[]
  readonly profitLoss: readonly ProfitLossRow[]
  readonly statusCards: readonly StatusCard[]
  readonly summary: {
    readonly cashAndBank: number
    readonly grossProfit: number
    readonly grossMargin: number
    readonly netMargin: number
    readonly netProfit: number
    readonly totalRevenue: number
  }
  readonly targets: readonly TargetProgress[]
}

/** Bobot lapangan tetap: warna dan urutan mengikuti entitas, bukan peringkatnya. */
const COURTS: readonly { code: string; name: string; sport: string; weight: number }[] = [
  { code: 'PDL-01', name: 'Padel Court 1', sport: 'Padel', weight: 0.168 },
  { code: 'PDL-02', name: 'Padel Court 2', sport: 'Padel', weight: 0.156 },
  { code: 'PDL-03', name: 'Padel Court 3', sport: 'Padel', weight: 0.142 },
  { code: 'PDL-04', name: 'Padel Court 4', sport: 'Padel', weight: 0.128 },
  { code: 'BDM-01', name: 'Badminton Hall A', sport: 'Badminton', weight: 0.121 },
  { code: 'BDM-02', name: 'Badminton Hall B', sport: 'Badminton', weight: 0.106 },
  { code: 'FTS-01', name: 'Futsal Arena', sport: 'Futsal', weight: 0.098 },
  { code: 'BSK-01', name: 'Basket Half Court', sport: 'Basket', weight: 0.081 },
]

const CHANNEL_SHARES: readonly { key: string; label: string; share: number }[] = [
  { key: 'mobile', label: 'Mobile app', share: 0.46 },
  { key: 'web', label: 'Web', share: 0.28 },
  { key: 'admin', label: 'Admin (booking manual)', share: 0.15 },
  { key: 'walk_in', label: 'Walk-in', share: 0.11 },
]

/** Neraca demo. Ditulis eksplisit dan dijaga seimbang: aset = liabilitas + ekuitas. */
const CURRENT_ASSETS: readonly StatusBreakdown[] = [
  { count: 0, label: 'Kas & bank', value: 486_000_000 },
  { count: 0, label: 'Piutang tenant', value: 38_500_000 },
  { count: 0, label: 'Persediaan', value: 24_000_000 },
]
const FIXED_ASSETS: readonly StatusBreakdown[] = [
  { count: 0, label: 'Lapangan & bangunan', value: 3_850_000_000 },
  { count: 0, label: 'Peralatan (nilai buku)', value: 265_000_000 },
]
const SHORT_TERM_LIABILITIES: readonly StatusBreakdown[] = [
  { count: 0, label: 'Utang usaha', value: 96_400_000 },
  { count: 0, label: 'Pendapatan diterima di muka', value: 74_200_000 },
  { count: 0, label: 'Utang pajak', value: 31_900_000 },
]
const LONG_TERM_LIABILITIES: readonly StatusBreakdown[] = [
  { count: 0, label: 'Pinjaman bank', value: 950_000_000 },
]
const PAID_CAPITAL = 2_800_000_000

/** Target tahunan ditetapkan di depan; persentasenya jatuh apa adanya. */
const ANNUAL_BOOKING_TARGET = 9_000
const ANNUAL_REVENUE_TARGET = 2_400_000_000

const sumOf = (rows: readonly StatusBreakdown[]): number =>
  rows.reduce((carry, row) => carry + row.value, 0)

function tenantRevenueFor(dayCount: number): number {
  // 5 kontrak aktif, rata-rata Rp 8,5 jt per bulan, diprorata per hari (docs/09 § 4.4).
  return Math.round((5 * 8_500_000 * dayCount) / 31)
}

function healthTone(
  value: number,
  thresholds: { good: number; warning: number },
): { tone: HealthIndicator['tone']; toneLabel: string } {
  if (value >= thresholds.good) return { tone: 'good', toneLabel: 'Sehat' }
  if (value >= thresholds.warning) return { tone: 'warning', toneLabel: 'Perlu perhatian' }
  return { tone: 'critical', toneLabel: 'Kritis' }
}

function trendOf(pick: (totals: MonthTotals) => number): number[] {
  return MONTH_SERIES.map((month) => pick(month.totals))
}

export function buildExecutiveReport(period: ResolvedPeriod): ExecutiveReport {
  const { comparisonTotals: previous, days, totals } = period
  const dayCount = days.length

  // ── Pendapatan per lini bisnis (docs/00 § Sumber pendapatan) ──────────────
  const courtRevenue = totals.revenue
  const tenantRevenue = tenantRevenueFor(dayCount)
  const eventRevenue = Math.round(courtRevenue * 0.11)
  const tournamentRevenue = Math.round(courtRevenue * 0.085)
  const totalRevenue = courtRevenue + tenantRevenue + eventRevenue + tournamentRevenue

  const previousCourtRevenue = previous.revenue
  const previousTotalRevenue = Math.round(previousCourtRevenue * 1.195 + tenantRevenueFor(dayCount))

  // ── Laba rugi (docs/14 § 4) ───────────────────────────────────────────────
  const discounts = Math.round(totalRevenue * 0.045)
  const netRevenue = totalRevenue - discounts
  const directCost = Math.round(netRevenue * 0.22)
  const grossProfit = netRevenue - directCost
  const operatingExpense = Math.round(netRevenue * 0.41)
  const ebitda = grossProfit - operatingExpense
  const depreciation = Math.round(18_500_000 * (dayCount / 31))
  const otherExpense = Math.round(netRevenue * 0.021)
  const netProfit = ebitda - depreciation - otherExpense

  /*
    Rasio periode pembanding sengaja sedikit berbeda dari periode berjalan —
    diskon lebih longgar, beban lebih tinggi. Kalau rasionya identik, setiap
    baris laba rugi akan tumbuh dengan persentase yang sama persis, dan kolom
    delta berubah jadi satu angka yang diulang sepuluh kali: benar secara
    aritmetika, tapi tidak menyerupai laporan mana pun.
  */
  const previousDiscounts = Math.round(previousTotalRevenue * 0.052)
  const previousNetRevenue = previousTotalRevenue - previousDiscounts
  const previousDirectCost = Math.round(previousNetRevenue * 0.235)
  const previousGrossProfit = previousNetRevenue - previousDirectCost
  const previousOperatingExpense = Math.round(previousNetRevenue * 0.427)
  const previousEbitda = previousGrossProfit - previousOperatingExpense
  const previousNetProfit = previousEbitda - depreciation - Math.round(previousNetRevenue * 0.024)

  // ── Corong konversi ───────────────────────────────────────────────────────
  const visits = Math.round(totals.bookings * 6.2)
  const holds = Math.round(totals.bookings * 1.28)
  const funnel: FunnelStageData[] = [
    { key: 'visit', label: 'Kunjungan jadwal', value: visits },
    { key: 'hold', label: 'Slot di-hold', value: holds },
    { key: 'booking', label: 'Booking dibuat', value: totals.bookings },
    { key: 'paid', label: 'Pembayaran lunas', value: totals.confirmedBookings },
  ]

  const rate = (a: number, b: number): number => (b === 0 ? 0 : (a / b) * 100)
  const conversionSteps = [
    { key: 'visit-hold', label: 'Kunjungan → Hold', rate: rate(holds, visits) },
    { key: 'hold-booking', label: 'Hold → Booking', rate: rate(totals.bookings, holds) },
    {
      key: 'booking-paid',
      label: 'Booking → Lunas',
      rate: rate(totals.confirmedBookings, totals.bookings),
    },
    {
      key: 'visit-paid',
      label: 'Kunjungan → Lunas (total)',
      rate: rate(totals.confirmedBookings, visits),
    },
  ]

  // ── Performa per lapangan ─────────────────────────────────────────────────
  const capacityPerCourt = totals.slotCapacity / COURTS.length
  const courts: CourtPerformance[] = COURTS.map((court) => {
    const slots = Math.round(totals.slotsUsed * court.weight)
    return {
      bookings: Math.round(totals.confirmedBookings * court.weight),
      code: court.code,
      name: court.name,
      occupancyRate: (slots / capacityPerCourt) * 100,
      revenue: Math.round(courtRevenue * court.weight),
      slots,
      sport: court.sport,
    }
  })

  // ── Distribusi ────────────────────────────────────────────────────────────
  const channels: DistributionItem[] = CHANNEL_SHARES.map((channel) => ({
    detail: `${Math.round(channel.share * 100)}% dari booking lunas`,
    key: channel.key,
    label: channel.label,
    value: Math.round(totals.confirmedBookings * channel.share),
  }))

  const businessLines: DistributionItem[] = [
    { key: 'court', label: 'Booking lapangan', value: courtRevenue },
    { key: 'tenant', label: 'Sewa tenant cafe', value: tenantRevenue },
    { key: 'event', label: 'Pendaftaran event', value: eventRevenue },
    { key: 'tournament', label: 'Entry fee turnamen', value: tournamentRevenue },
  ]

  // ── Arus kas ──────────────────────────────────────────────────────────────
  const gatewayInflow = Math.round(courtRevenue * 0.74)
  const cashInflow = Math.round(courtRevenue * 0.22)
  const inflow: StatusBreakdown[] = [
    { count: 0, label: 'Settlement payment gateway', value: gatewayInflow },
    { count: 0, label: 'Pembayaran tunai di venue', value: cashInflow },
    { count: 0, label: 'Pembayaran tenant', value: tenantRevenue },
    { count: 0, label: 'Event & turnamen', value: eventRevenue + tournamentRevenue },
  ]
  const outflow: StatusBreakdown[] = [
    { count: 0, label: 'Beban operasional', value: operatingExpense },
    { count: 0, label: 'Beban langsung lapangan', value: directCost },
    { count: 0, label: 'Refund dibayarkan', value: Math.round(courtRevenue * 0.018) },
  ]
  const totalInflow = sumOf(inflow)
  const totalOutflow = sumOf(outflow)

  // ── Neraca ────────────────────────────────────────────────────────────────
  const totalAssets = sumOf(CURRENT_ASSETS) + sumOf(FIXED_ASSETS)
  const totalLiabilities = sumOf(SHORT_TERM_LIABILITIES) + sumOf(LONG_TERM_LIABILITIES)
  const totalEquity = totalAssets - totalLiabilities
  const retainedEarnings = totalEquity - PAID_CAPITAL

  // ── Indikator kesehatan ───────────────────────────────────────────────────
  const bookingGrowth = percentChange(totals.bookings, previous.bookings) ?? 0
  const revenueGrowth = percentChange(totals.revenue, previous.revenue) ?? 0
  const paidConversion = rate(totals.confirmedBookings, totals.bookings)
  const netMargin = rate(netProfit, totalRevenue)
  const grossMargin = rate(grossProfit, totalRevenue)
  const currentRatio = sumOf(CURRENT_ASSETS) / sumOf(SHORT_TERM_LIABILITIES)

  const health: HealthIndicator[] = [
    {
      key: 'booking-growth',
      label: 'Pertumbuhan booking (MoM)',
      trend: trendOf((entry) => entry.bookings),
      value: `${bookingGrowth > 0 ? '+' : ''}${bookingGrowth.toFixed(1).replace('.', ',')}%`,
      ...healthTone(bookingGrowth, { good: 3, warning: 0 }),
    },
    {
      key: 'conversion',
      label: 'Konversi booking → lunas',
      trend: trendOf((entry) => (entry.confirmedBookings / entry.bookings) * 100),
      value: `${paidConversion.toFixed(1).replace('.', ',')}%`,
      ...healthTone(paidConversion, { good: 88, warning: 80 }),
    },
    {
      key: 'revenue-growth',
      label: 'Pertumbuhan pendapatan (MoM)',
      trend: trendOf((entry) => entry.revenue),
      value: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1).replace('.', ',')}%`,
      ...healthTone(revenueGrowth, { good: 3, warning: 0 }),
    },
    {
      key: 'occupancy',
      label: 'Okupansi lapangan',
      trend: trendOf((entry) => entry.occupancyRate),
      value: `${totals.occupancyRate.toFixed(1).replace('.', ',')}%`,
      ...healthTone(totals.occupancyRate, { good: 45, warning: 32 }),
    },
    // Dua indikator berikut sengaja tanpa sparkline: margin dan current ratio
    // demo ini turunan rasio tetap, jadi grafiknya akan datar dan menyiratkan
    // stabilitas yang tidak diukur oleh apa pun.
    {
      key: 'net-margin',
      label: 'Margin laba bersih',
      value: `${netMargin.toFixed(1).replace('.', ',')}%`,
      ...healthTone(netMargin, { good: 20, warning: 10 }),
    },
    {
      key: 'current-ratio',
      label: 'Current ratio',
      value: `${currentRatio.toFixed(2).replace('.', ',')}x`,
      ...healthTone(currentRatio, { good: 1.5, warning: 1 }),
    },
  ]

  // ── Target tahunan ────────────────────────────────────────────────────────
  const ytdBookings = MONTH_SERIES.reduce((carry, month) => carry + month.totals.bookings, 0)
  const ytdRevenue = MONTH_SERIES.reduce((carry, month) => carry + month.totals.revenue, 0)

  // ── Kartu status operasional ──────────────────────────────────────────────
  const upcoming = days.slice(-7)
  const upcomingBookings = upcoming.reduce((carry, point) => carry + point.confirmedBookings, 0)
  const upcomingRevenue = upcoming.reduce((carry, point) => carry + point.revenue, 0)

  const split = (count: number, amount: number): StatusBreakdown[] => [
    {
      count: Math.round(count * 0.82),
      label: 'Booking reguler',
      value: Math.round(amount * 0.79),
    },
    { count: Math.round(count * 0.12), label: 'Event', value: Math.round(amount * 0.13) },
    { count: Math.round(count * 0.06), label: 'Turnamen', value: Math.round(amount * 0.08) },
  ]

  return {
    balanceSheet: {
      currentAssets: CURRENT_ASSETS,
      equity: [
        { count: 0, label: 'Modal disetor', value: PAID_CAPITAL },
        { count: 0, label: 'Laba ditahan', value: retainedEarnings },
      ],
      fixedAssets: FIXED_ASSETS,
      longTermLiabilities: LONG_TERM_LIABILITIES,
      shortTermLiabilities: SHORT_TERM_LIABILITIES,
      totalAssets,
      totalEquity,
      totalLiabilities,
    },
    businessLines,
    cashFlow: { inflow, net: totalInflow - totalOutflow, outflow, totalInflow, totalOutflow },
    channels,
    conversionSteps,
    courts,
    financeTrend: {
      cash: MONTH_SERIES.map((month) => month.totals.revenue),
      labels: MONTH_SERIES.map((month) => shortMonthLabel(month.month, month.year)),
    },
    funnel,
    health,
    profitLoss: [
      {
        current: totalRevenue,
        key: 'revenue',
        label: 'Pendapatan',
        previous: previousTotalRevenue,
      },
      {
        current: -discounts,
        key: 'discount',
        label: 'Diskon & voucher (contra-revenue)',
        previous: -previousDiscounts,
      },
      {
        current: netRevenue,
        key: 'net-revenue',
        label: 'Pendapatan bersih',
        previous: previousNetRevenue,
      },
      {
        current: -directCost,
        key: 'direct-cost',
        label: 'Beban langsung lapangan',
        previous: -previousDirectCost,
      },
      {
        current: grossProfit,
        emphasis: true,
        key: 'gross-profit',
        label: 'Laba kotor',
        previous: previousGrossProfit,
      },
      {
        current: -operatingExpense,
        key: 'opex',
        label: 'Beban operasional',
        previous: -previousOperatingExpense,
      },
      { current: ebitda, emphasis: true, key: 'ebitda', label: 'EBITDA', previous: previousEbitda },
      {
        current: -depreciation,
        key: 'depreciation',
        label: 'Penyusutan',
        previous: -depreciation,
      },
      {
        current: -otherExpense,
        key: 'other',
        label: 'Beban lainnya',
        previous: -Math.round(previousNetRevenue * 0.024),
      },
      {
        current: netProfit,
        emphasis: true,
        key: 'net-profit',
        label: 'Laba bersih',
        previous: previousNetProfit,
      },
    ],
    statusCards: [
      {
        amount: upcomingRevenue,
        breakdown: split(upcomingBookings, upcomingRevenue),
        count: upcomingBookings,
        key: 'upcoming',
        title: 'Booking terjadwal · 7 hari terakhir periode',
        tone: 'accent',
      },
      {
        amount: courtRevenue,
        breakdown: split(totals.confirmedBookings, courtRevenue),
        count: totals.confirmedBookings,
        key: 'completed',
        title: 'Booking lunas · sepanjang periode',
        tone: 'good',
      },
    ],
    summary: {
      cashAndBank: CURRENT_ASSETS[0]?.value ?? 0,
      grossMargin,
      grossProfit,
      netMargin,
      netProfit,
      totalRevenue,
    },
    targets: [
      {
        caption: `${ytdBookings.toLocaleString('id-ID')} dari ${ANNUAL_BOOKING_TARGET.toLocaleString('id-ID')} booking`,
        label: 'Total booking 2026',
        percent: (ytdBookings / ANNUAL_BOOKING_TARGET) * 100,
      },
      {
        caption: `Rp ${(ytdRevenue / 1_000_000_000).toFixed(2).replace('.', ',')} M dari Rp ${(ANNUAL_REVENUE_TARGET / 1_000_000_000).toFixed(1).replace('.', ',')} M`,
        label: 'Pendapatan 2026',
        percent: (ytdRevenue / ANNUAL_REVENUE_TARGET) * 100,
      },
    ],
  }
}
