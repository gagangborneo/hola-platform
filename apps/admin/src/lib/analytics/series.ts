/**
 * Deret harian demo untuk dashboard analitik.
 *
 * SEMUA ANGKA DI SINI FIKTIF — dipakai untuk memperagakan bentuk laporan
 * sebelum endpoint `GET /admin/reports/*` (docs/14 § 7) siap. Saat endpoint itu
 * ada, halaman dashboard tinggal menukar sumber datanya; bentuk `MonthSeries`
 * sengaja dibuat menyerupai hasil agregasi harian dari API.
 *
 * Generatornya di-seed, bukan `Math.random()`, karena dua alasan yang keduanya
 * mengikat: angka harus sama antara render server dan render klien (kalau tidak
 * React melaporkan hydration mismatch), dan demo ke client tidak boleh berganti
 * angka setiap kali halaman dimuat ulang.
 */

/** PRNG mulberry32 — cukup untuk data peraga, dan hasilnya sama di mana saja. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Kapasitas venue peraga: 8 lapangan × 15 jam operasional (07.00–22.00). */
export const COURT_COUNT = 8
export const OPERATING_HOURS = 15
export const DAILY_SLOT_CAPACITY = COURT_COUNT * OPERATING_HOURS

export interface DailyPoint {
  readonly bookings: number
  readonly confirmedBookings: number
  readonly dateKey: string
  readonly day: number
  readonly isWeekend: boolean
  readonly newMembers: number
  readonly revenue: number
  readonly slotsUsed: number
}

export interface MonthTotals {
  readonly avgOrderValue: number
  readonly bookings: number
  readonly confirmedBookings: number
  readonly newMembers: number
  readonly occupancyRate: number
  readonly revenue: number
  readonly slotCapacity: number
  readonly slotsUsed: number
}

export interface MonthSeries {
  readonly days: readonly DailyPoint[]
  readonly label: string
  readonly month: number
  readonly totals: MonthTotals
  readonly year: number
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const

export function monthLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1] ?? '—'} ${year}`
}

export function shortMonthLabel(month: number, year: number): string {
  return `${MONTH_SHORT[month - 1] ?? '—'} ${String(year).slice(2)}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

interface MonthOptions {
  /** Pengali seluruh volume bulan itu — dipakai untuk membentuk tren antar-bulan. */
  readonly scale: number
  readonly seed: number
}

/**
 * Akhir pekan di sports center bukan variasi kecil: lapangan penuh sore–malam
 * dan tarifnya kelas peak, jadi deretnya sengaja dibuat berirama mingguan.
 * Tanpa itu grafiknya terlihat seperti derau, bukan seperti bisnis lapangan.
 */
export function generateMonth(year: number, month: number, options: MonthOptions): MonthSeries {
  const random = createRandom(options.seed)
  const total = daysInMonth(year, month)
  const days: DailyPoint[] = []

  for (let day = 1; day <= total; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    const isWeekend = weekday === 0 || weekday === 6
    const jitter = 0.85 + random() * 0.3

    const bookings = Math.round((isWeekend ? 52 : 27) * options.scale * jitter)
    const confirmedBookings = Math.round(bookings * (0.86 + random() * 0.07))
    const slotsUsed = Math.min(
      DAILY_SLOT_CAPACITY,
      Math.round(confirmedBookings * (1.5 + random() * 0.3)),
    )
    const slotPrice = Math.round((isWeekend ? 178_000 : 132_000) * (0.94 + random() * 0.12))

    days.push({
      bookings,
      confirmedBookings,
      dateKey: `${year}-${pad(month)}-${pad(day)}`,
      day,
      isWeekend,
      newMembers: Math.round((isWeekend ? 11 : 5) * options.scale * (0.7 + random() * 0.7)),
      revenue: slotsUsed * slotPrice,
      slotsUsed,
    })
  }

  return { days, label: monthLabel(month, year), month, totals: totalsOf(days), year }
}

/**
 * Total dijumlahkan dari deret harian, tidak ditulis terpisah. Kalau ditulis
 * terpisah, angka kartu KPI dan angka grafik bisa berbeda — dan itu persis hal
 * pertama yang dicek orang saat membaca dashboard.
 */
export function totalsOf(days: readonly DailyPoint[]): MonthTotals {
  const sum = (pick: (point: DailyPoint) => number): number =>
    days.reduce((carry, point) => carry + pick(point), 0)

  const bookings = sum((point) => point.bookings)
  const confirmedBookings = sum((point) => point.confirmedBookings)
  const revenue = sum((point) => point.revenue)
  const slotsUsed = sum((point) => point.slotsUsed)
  const slotCapacity = days.length * DAILY_SLOT_CAPACITY

  return {
    avgOrderValue: confirmedBookings === 0 ? 0 : Math.round(revenue / confirmedBookings),
    bookings,
    confirmedBookings,
    newMembers: sum((point) => point.newMembers),
    occupancyRate: (slotsUsed / slotCapacity) * 100,
    revenue,
    slotCapacity,
    slotsUsed,
  }
}

/** Rata-rata bergerak — meredam irama mingguan saat yang dicari arah tren. */
export function movingAverage(values: readonly number[], window: number): number[] {
  return values.map((_, index) => {
    const from = Math.max(0, index - window + 1)
    const slice = values.slice(from, index + 1)
    return slice.reduce((carry, value) => carry + value, 0) / slice.length
  })
}
