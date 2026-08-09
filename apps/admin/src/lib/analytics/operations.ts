/**
 * Agregasi operasional dari data API.
 *
 * Berbeda dari modul `analytics` lain di folder ini, di sini TIDAK ADA angka
 * demo: seluruhnya dijumlahkan dari booking dan pembayaran yang benar-benar
 * dikembalikan API untuk rentang tanggal terpilih.
 *
 * Pengelompokan hari mengikuti dua sumbu waktu yang berbeda dan itu disengaja:
 * booking dikelompokkan pada `booking_date` (tanggal main), pembayaran pada
 * tanggal WITA dari `paid_at` (kapan uangnya masuk). Menyatukan keduanya ke satu
 * sumbu akan membuat salah satu grafik menjawab pertanyaan yang tidak diajukan.
 */
import { witaDateYmd } from '@hola/shared'
import type { Booking } from '../bookings.ts'
import { shiftDateKey } from '../format.ts'
import * as labels from '../labels.ts'
import type { Payment } from '../payments.ts'

/** Batas rentang yang bisa dipilih. Menjaga jumlah request tetap wajar. */
export const MAX_RANGE_DAYS = 92

export interface DailyBucket {
  readonly bookings: number
  readonly dateKey: string
  readonly paidBookings: number
  readonly revenue: number
  readonly slots: number
}

export interface DistributionRow {
  readonly detail: string
  readonly key: string
  readonly label: string
  readonly value: number
}

export interface OperationsSummary {
  readonly buckets: readonly DailyBucket[]
  readonly channels: readonly DistributionRow[]
  readonly labels: readonly string[]
  readonly methods: readonly DistributionRow[]
  readonly statuses: readonly DistributionRow[]
  readonly totals: {
    readonly activeSlots: number
    readonly bookings: number
    readonly bookingValue: number
    readonly cancelled: number
    readonly paidBookings: number
    readonly pending: number
    readonly revenue: number
  }
}

/** Status yang berarti slotnya benar-benar terpakai. */
const PAID_STATUSES: readonly string[] = ['confirmed', 'completed']
const DEAD_STATUSES: readonly string[] = ['cancelled', 'expired']

const STATUS_ORDER: readonly string[] = [
  'completed',
  'confirmed',
  'pending_payment',
  'cancelled',
  'expired',
  'no_show',
]

const CHANNEL_ORDER: readonly string[] = ['mobile', 'web', 'admin', 'walk_in']

export function dateKeysBetween(from: string, to: string): string[] {
  const keys: string[] = []
  let cursor = from
  // Dibatasi keras: rentang terbalik atau salah ketik tidak boleh jadi loop tak berujung.
  for (let guard = 0; guard < MAX_RANGE_DAYS && cursor <= to; guard += 1) {
    keys.push(cursor)
    cursor = shiftDateKey(cursor, 1)
  }
  return keys
}

/** Label sumbu-x: tanggal saja untuk satu bulan, `d/m` bila melewati batas bulan. */
function axisLabels(dateKeys: readonly string[]): string[] {
  const months = new Set(dateKeys.map((key) => key.slice(0, 7)))
  return dateKeys.map((key) => {
    const [, month = '', day = ''] = key.split('-')
    return months.size > 1 ? `${Number(day)}/${Number(month)}` : String(Number(day))
  })
}

function toRows(
  counts: Map<string, number>,
  order: readonly string[],
  total: number,
  toLabel: (key: string) => string,
): DistributionRow[] {
  const share = (value: number): string =>
    total === 0 ? '0%' : `${((value / total) * 100).toFixed(1).replace('.', ',')}%`

  // Kunci di luar daftar urutan tetap ikut tampil di belakang — enum baru di API
  // sebaiknya muncul apa adanya, bukan hilang diam-diam dari grafik.
  const known = order.filter((key) => counts.has(key))
  const extra = [...counts.keys()].filter((key) => !order.includes(key)).sort()

  return [...known, ...extra].map((key) => {
    const value = counts.get(key) ?? 0
    return { detail: share(value), key, label: toLabel(key), value }
  })
}

function increment(map: Map<string, number>, key: string, by: number): void {
  map.set(key, (map.get(key) ?? 0) + by)
}

export function buildOperationsSummary(
  dateKeys: readonly string[],
  bookings: readonly Booking[],
  payments: readonly Payment[],
): OperationsSummary {
  const byDate = new Map<string, { bookings: number; paidBookings: number; slots: number }>()
  for (const key of dateKeys) byDate.set(key, { bookings: 0, paidBookings: 0, slots: 0 })

  const statusCounts = new Map<string, number>()
  const channelCounts = new Map<string, number>()
  let bookingValue = 0

  for (const booking of bookings) {
    increment(statusCounts, booking.status, 1)

    const isPaid = PAID_STATUSES.includes(booking.status)
    if (isPaid) {
      increment(channelCounts, booking.channel, 1)
      bookingValue += booking.totalAmount
    }

    const bucket = byDate.get(booking.bookingDate)
    if (bucket === undefined) continue
    bucket.bookings += 1
    if (isPaid) bucket.paidBookings += 1
    if (!DEAD_STATUSES.includes(booking.status)) bucket.slots += booking.slotCount
  }

  const revenueByDate = new Map<string, number>()
  const methodTotals = new Map<string, number>()
  let revenue = 0

  for (const payment of payments) {
    if (payment.paidAt === null) continue
    revenue += payment.amount
    increment(methodTotals, payment.method, payment.amount)
    increment(revenueByDate, witaDateYmd(new Date(payment.paidAt)), payment.amount)
  }

  const buckets = dateKeys.map((dateKey) => {
    const bucket = byDate.get(dateKey) ?? { bookings: 0, paidBookings: 0, slots: 0 }
    return {
      bookings: bucket.bookings,
      dateKey,
      paidBookings: bucket.paidBookings,
      revenue: revenueByDate.get(dateKey) ?? 0,
      slots: bucket.slots,
    }
  })

  const paidBookings = PAID_STATUSES.reduce(
    (carry, status) => carry + (statusCounts.get(status) ?? 0),
    0,
  )

  return {
    buckets,
    channels: toRows(
      channelCounts,
      CHANNEL_ORDER,
      paidBookings,
      (key) => labels.bookingChannel(key).label,
    ),
    labels: axisLabels(dateKeys),
    methods: toRows(methodTotals, [], revenue, (key) => labels.paymentMethod(key).label),
    statuses: toRows(
      statusCounts,
      STATUS_ORDER,
      bookings.length,
      (key) => labels.bookingStatus(key).label,
    ),
    totals: {
      activeSlots: buckets.reduce((carry, bucket) => carry + bucket.slots, 0),
      bookings: bookings.length,
      bookingValue,
      cancelled: statusCounts.get('cancelled') ?? 0,
      paidBookings,
      pending: statusCounts.get('pending_payment') ?? 0,
      revenue,
    },
  }
}
