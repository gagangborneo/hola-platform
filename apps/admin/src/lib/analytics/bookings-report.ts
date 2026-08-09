/**
 * Laporan pemesanan demo.
 *
 * Status, kanal, dan sebaran waktu semuanya dipecah dari total periode yang
 * sama, jadi jumlah tiap pecahan selalu kembali ke angka di kartu KPI. Nama
 * statusnya mengikuti enum `booking_status` (docs/03 § 3) supaya istilah di
 * dashboard sama dengan istilah di tabel booking.
 */
import type { ResolvedPeriod } from './periods.ts'
import type { DailyPoint } from './series.ts'

export interface BookingsReport {
  readonly cancellationRate: number
  readonly channels: readonly { key: string; label: string; value: number; detail: string }[]
  readonly leadTime: readonly { key: string; label: string; value: number }[]
  readonly peakHours: readonly { key: string; label: string; value: number }[]
  readonly slotsPerBooking: number
  readonly statuses: readonly { key: string; label: string; value: number; detail: string }[]
  readonly weekdays: readonly { key: string; label: string; value: number; detail: string }[]
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

/** Bentuk hari operasional 07.00–22.00: sepi pagi, ramai sore, puncak 19.00–21.00. */
const HOUR_SHAPE: readonly number[] = [
  0.018, 0.022, 0.028, 0.032, 0.036, 0.041, 0.048, 0.055, 0.068, 0.082, 0.098, 0.118, 0.132, 0.126,
  0.096,
]

const CHANNEL_SHARES: readonly { key: string; label: string; share: number }[] = [
  { key: 'mobile', label: 'Mobile app', share: 0.46 },
  { key: 'web', label: 'Web', share: 0.28 },
  { key: 'admin', label: 'Admin (booking manual)', share: 0.15 },
  { key: 'walk_in', label: 'Walk-in', share: 0.11 },
]

/** Sisa booking yang tidak lunas dibagi ke empat status akhir yang mungkin. */
const UNPAID_SHARES: readonly { key: string; label: string; weight: number }[] = [
  { key: 'pending_payment', label: 'Menunggu pembayaran', weight: 0.38 },
  { key: 'cancelled', label: 'Dibatalkan', weight: 0.27 },
  { key: 'expired', label: 'Kedaluwarsa', weight: 0.22 },
  { key: 'no_show', label: 'Tidak hadir', weight: 0.13 },
]

const LEAD_TIME_SHARES: readonly { key: string; label: string; share: number }[] = [
  { key: 'same-day', label: 'Hari yang sama', share: 0.31 },
  { key: 'next-day', label: '1 hari sebelum', share: 0.24 },
  { key: 'week', label: '2–7 hari sebelum', share: 0.32 },
  { key: 'later', label: 'Lebih dari 7 hari', share: 0.13 },
]

function shareOf(total: number, value: number): string {
  return total === 0 ? '0%' : `${((value / total) * 100).toFixed(1).replace('.', ',')}%`
}

export function buildBookingsReport(period: ResolvedPeriod): BookingsReport {
  const { days, totals } = period
  const unpaid = totals.bookings - totals.confirmedBookings

  // Pembulatan per potongan bisa menyisakan selisih; sisanya dijatuhkan ke
  // status terbesar supaya jumlah seluruh status tetap sama dengan total booking.
  const unpaidRows = UNPAID_SHARES.map((entry) => ({
    detail: shareOf(totals.bookings, Math.round(unpaid * entry.weight)),
    key: entry.key,
    label: entry.label,
    value: Math.round(unpaid * entry.weight),
  }))
  const unpaidSum = unpaidRows.reduce((carry, row) => carry + row.value, 0)
  const completed = Math.round(totals.confirmedBookings * 0.78)

  const statuses = [
    {
      detail: shareOf(totals.bookings, completed),
      key: 'completed',
      label: 'Selesai',
      value: completed,
    },
    {
      detail: shareOf(totals.bookings, totals.confirmedBookings - completed),
      key: 'confirmed',
      label: 'Terkonfirmasi',
      value: totals.confirmedBookings - completed,
    },
    ...unpaidRows.map((row, index) =>
      index === 0 ? { ...row, value: row.value + (unpaid - unpaidSum) } : row,
    ),
  ]

  const byWeekday = DAY_NAMES.map((label, index) => {
    const matching = days.filter(
      (point: DailyPoint) => new Date(`${point.dateKey}T00:00:00Z`).getUTCDay() === index,
    )
    const value = matching.reduce((carry, point) => carry + point.bookings, 0)
    return {
      detail: `${matching.length} hari · rata-rata ${
        matching.length === 0 ? 0 : Math.round(value / matching.length)
      } booking`,
      key: label,
      label,
      value,
    }
  })

  const cancelled = unpaidRows.find((row) => row.key === 'cancelled')?.value ?? 0

  return {
    cancellationRate: totals.bookings === 0 ? 0 : (cancelled / totals.bookings) * 100,
    channels: CHANNEL_SHARES.map((entry) => ({
      detail: `${Math.round(entry.share * 100)}% dari booking lunas`,
      key: entry.key,
      label: entry.label,
      value: Math.round(totals.confirmedBookings * entry.share),
    })),
    leadTime: LEAD_TIME_SHARES.map((entry) => ({
      key: entry.key,
      label: entry.label,
      value: Math.round(totals.confirmedBookings * entry.share),
    })),
    peakHours: HOUR_SHAPE.map((share, index) => ({
      key: `hour-${index}`,
      label: `${String(index + 7).padStart(2, '0')}.00`,
      value: Math.round(totals.slotsUsed * share),
    })),
    slotsPerBooking:
      totals.confirmedBookings === 0 ? 0 : totals.slotsUsed / totals.confirmedBookings,
    statuses,
    weekdays: byWeekday,
  }
}
