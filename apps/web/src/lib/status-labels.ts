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
