/**
 * Peta enum domain ke Bahasa Indonesia untuk back-office.
 *
 * Satu sumber kebenaran lintas layar: booking yang sama tidak boleh tampil
 * "Menunggu pembayaran" di tabel dan `pending_payment` mentah di detail.
 * Nilai tak dikenal jatuh ke teks yang tetap terbaca manusia, bukan enum mentah.
 */

export type ChipTone = 'neutral' | 'positive' | 'warning' | 'danger'

interface LabelEntry {
  label: string
  tone: ChipTone
}

function lookup(map: Record<string, LabelEntry>, value: string, fallback: string): LabelEntry {
  return map[value] ?? { label: fallback, tone: 'neutral' }
}

const BOOKING_STATUS: Record<string, LabelEntry> = {
  pending_payment: { label: 'Menunggu pembayaran', tone: 'warning' },
  confirmed: { label: 'Terkonfirmasi', tone: 'positive' },
  completed: { label: 'Selesai', tone: 'neutral' },
  cancelled: { label: 'Dibatalkan', tone: 'danger' },
  expired: { label: 'Kedaluwarsa', tone: 'danger' },
  no_show: { label: 'Tidak hadir', tone: 'danger' },
}

export function bookingStatus(value: string): LabelEntry {
  return lookup(BOOKING_STATUS, value, 'Status tidak dikenal')
}

const BOOKING_CHANNEL: Record<string, LabelEntry> = {
  web: { label: 'Web', tone: 'neutral' },
  mobile: { label: 'Mobile', tone: 'neutral' },
  admin: { label: 'Admin', tone: 'neutral' },
  walk_in: { label: 'Walk-in', tone: 'neutral' },
}

export function bookingChannel(value: string): LabelEntry {
  return lookup(BOOKING_CHANNEL, value, 'Kanal lain')
}

const PAYMENT_STATUS: Record<string, LabelEntry> = {
  pending: { label: 'Menunggu pembayaran', tone: 'warning' },
  paid: { label: 'Dibayar', tone: 'positive' },
  failed: { label: 'Gagal', tone: 'danger' },
  expired: { label: 'Kedaluwarsa', tone: 'danger' },
  cancelled: { label: 'Dibatalkan', tone: 'danger' },
}

export function paymentStatus(value: string): LabelEntry {
  return lookup(PAYMENT_STATUS, value, 'Status tidak dikenal')
}

const PAYMENT_METHOD: Record<string, LabelEntry> = {
  qris: { label: 'QRIS', tone: 'neutral' },
  gopay: { label: 'GoPay', tone: 'neutral' },
  shopeepay: { label: 'ShopeePay', tone: 'neutral' },
  bank_transfer_va: { label: 'Transfer VA', tone: 'neutral' },
  credit_card: { label: 'Kartu kredit', tone: 'neutral' },
  cash: { label: 'Tunai', tone: 'neutral' },
  manual_transfer: { label: 'Transfer manual', tone: 'neutral' },
}

export function paymentMethod(value: string): LabelEntry {
  return lookup(PAYMENT_METHOD, value, 'Metode lain')
}

const REFUND_STATUS: Record<string, LabelEntry> = {
  requested: { label: 'Diajukan', tone: 'warning' },
  approved: { label: 'Disetujui', tone: 'neutral' },
  processing: { label: 'Diproses', tone: 'neutral' },
  completed: { label: 'Selesai', tone: 'positive' },
  rejected: { label: 'Ditolak', tone: 'danger' },
  failed: { label: 'Gagal', tone: 'danger' },
}

export function refundStatus(value: string): LabelEntry {
  return lookup(REFUND_STATUS, value, 'Status tidak dikenal')
}

const REFUND_CHANNEL: Record<string, LabelEntry> = {
  gateway: { label: 'Gateway', tone: 'neutral' },
  manual_transfer: { label: 'Transfer manual', tone: 'neutral' },
  cash: { label: 'Tunai', tone: 'neutral' },
}

export function refundChannel(value: string): LabelEntry {
  return lookup(REFUND_CHANNEL, value, 'Kanal lain')
}

const CLAIM_TYPE: Record<string, LabelEntry> = {
  booking: { label: 'Booking', tone: 'positive' },
  maintenance: { label: 'Maintenance', tone: 'danger' },
  event: { label: 'Event', tone: 'warning' },
  match: { label: 'Match', tone: 'warning' },
}

/**
 * `event` dan `match` sudah dipetakan sekarang: Phase 2 & 4 mulai menulis klaim
 * bertipe itu tanpa mengubah UI kalender ini (P1-82).
 */
export function claimType(value: string): LabelEntry {
  return lookup(CLAIM_TYPE, value, 'Klaim lain')
}

const CLAIM_STATUS: Record<string, LabelEntry> = {
  held: { label: 'Hold', tone: 'warning' },
  confirmed: { label: 'Terkunci', tone: 'positive' },
  released: { label: 'Dilepas', tone: 'neutral' },
}

export function claimStatus(value: string): LabelEntry {
  return lookup(CLAIM_STATUS, value, 'Status tidak dikenal')
}

const PROMO_STATUS: Record<string, LabelEntry> = {
  draft: { label: 'Draft', tone: 'neutral' },
  active: { label: 'Aktif', tone: 'positive' },
  paused: { label: 'Dijeda', tone: 'warning' },
  expired: { label: 'Kedaluwarsa', tone: 'danger' },
  archived: { label: 'Diarsipkan', tone: 'neutral' },
}

export function promoStatus(value: string): LabelEntry {
  return lookup(PROMO_STATUS, value, 'Status tidak dikenal')
}

const PROMO_TYPE: Record<string, LabelEntry> = {
  percent: { label: 'Persen', tone: 'neutral' },
  fixed: { label: 'Nominal', tone: 'neutral' },
  free_slot: { label: 'Slot gratis', tone: 'neutral' },
}

export function promoType(value: string): LabelEntry {
  return lookup(PROMO_TYPE, value, 'Jenis lain')
}

const COURT_STATUS: Record<string, LabelEntry> = {
  active: { label: 'Aktif', tone: 'positive' },
  maintenance: { label: 'Maintenance', tone: 'warning' },
  inactive: { label: 'Nonaktif', tone: 'neutral' },
}

export function courtStatus(value: string): LabelEntry {
  return lookup(COURT_STATUS, value, 'Status tidak dikenal')
}

const RATE_CLASS: Record<string, LabelEntry> = {
  peak: { label: 'Peak', tone: 'warning' },
  offpeak: { label: 'Off-peak', tone: 'neutral' },
  special: { label: 'Spesial', tone: 'positive' },
}

export function rateClass(value: string): LabelEntry {
  return lookup(RATE_CLASS, value, 'Kelas lain')
}

const DAY_TYPE: Record<string, LabelEntry> = {
  weekday: { label: 'Hari kerja', tone: 'neutral' },
  weekend: { label: 'Akhir pekan', tone: 'neutral' },
  holiday: { label: 'Hari libur', tone: 'neutral' },
  specific_date: { label: 'Tanggal tertentu', tone: 'neutral' },
}

export function dayType(value: string): LabelEntry {
  return lookup(DAY_TYPE, value, 'Jenis lain')
}

const USER_STATUS: Record<string, LabelEntry> = {
  active: { label: 'Aktif', tone: 'positive' },
  suspended: { label: 'Ditangguhkan', tone: 'warning' },
  deleted: { label: 'Dihapus', tone: 'danger' },
}

export function userStatus(value: string): LabelEntry {
  return lookup(USER_STATUS, value, 'Status tidak dikenal')
}
