/**
 * Peta status booking & pembayaran ke Bahasa Indonesia — satu sumber kebenaran
 * dipakai lintas layar (`BookingList`, `BookingDetail`, `Receipt`,
 * `PaymentStatus`) supaya booking/pembayaran yang sama tidak pernah
 * menampilkan status berbeda di halaman berbeda (mis. "Menunggu pembayaran"
 * di satu layar vs `pending_payment` mentah di layar lain — P1.K I1).
 */
const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Menunggu pembayaran',
  confirmed: 'Terkonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
  no_show: 'Tidak hadir',
}

/** Fallback human-terbaca, bukan enum mentah, untuk nilai yang tidak dikenali. */
export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABEL[status] ?? 'Status tidak dikenal'
}

export type BookingUsageTone = 'ready' | 'used'

export interface BookingUsage {
  label: string
  tone: BookingUsageTone
}

/**
 * Status pemakaian: "tiket ini sudah dipakai main atau belum", yang tidak sama
 * dengan status booking. `checked_in_at` diisi saat petugas melakukan check-in
 * (`POST /bookings/{id}/check-in`), jadi itulah penanda sesungguhnya.
 *
 * Mengembalikan `null` saat tidak menambah informasi apa pun di atas
 * `bookingStatusLabel` — mis. `pending_payment` yang lencananya sudah berbunyi
 * "Menunggu pembayaran", atau `cancelled` yang jelas tidak akan dipakai. Tanpa
 * aturan itu setiap kartu memuat dua lencana yang mengatakan hal yang sama.
 */
export function bookingUsageLabel(booking: {
  status: string
  checked_in_at?: string | null
}): BookingUsage | null {
  if (booking.status === 'completed') return { label: 'Sudah digunakan', tone: 'used' }
  if (booking.status !== 'confirmed') return null
  return booking.checked_in_at
    ? { label: 'Sudah digunakan', tone: 'used' }
    : { label: 'Belum digunakan', tone: 'ready' }
}

const BOOKING_CHANNEL_LABEL: Record<string, string> = {
  web: 'Situs web',
  mobile: 'Aplikasi Hola',
  admin: 'Dibantu staff',
  walk_in: 'Walk-in di lokasi',
}

export function bookingChannelLabel(channel: string): string {
  return BOOKING_CHANNEL_LABEL[channel] ?? 'Kanal lain'
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu pembayaran',
  paid: 'Dibayar',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
  refunded: 'Dikembalikan',
}

/** Fallback human-terbaca, bukan enum mentah, untuk nilai yang tidak dikenali. */
export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABEL[status] ?? 'Status tidak dikenal'
}
