const TIMEZONE = 'Asia/Makassar'

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const timeWita = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const dateWita = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateKeyWita = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

/**
 * Hanya memformat. Tidak menjumlah, mengali, atau membulatkan — seluruh angka
 * rupiah datang jadi dari API (BR-B-12).
 */
export function formatRupiah(amount: number): string {
  return rupiah.format(amount).replace(/\s/g, '')
}

export function formatTimeWita(iso: string): string {
  return timeWita.format(new Date(iso))
}

export function formatDateWita(iso: string): string {
  return dateWita.format(new Date(iso))
}

/** Indeks mengikuti `EXTRACT(DOW)`: 0 = Minggu. */
export function formatDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? '—'
}

/** Kolom `time` PostgreSQL datang sebagai `HH:MM:SS` atau `HH:MM`. */
export function formatClock(time: string): string {
  const [hour = '00', minute = '00'] = time.split(':')
  return `${hour}.${minute}`
}

/** `yyyy-mm-dd` menurut WITA — tanggal bisnis booking (BR-B-01). */
export function witaDateKey(iso: string): string {
  return dateKeyWita.format(new Date(iso))
}
