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

const dayNumberWita = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  day: 'numeric',
})

const monthShortWita = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  month: 'short',
})

const weekdayShortWita = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  weekday: 'short',
})

const dateKeyWita = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Indeks hari menurut WITA. Dihitung lewat formatter `en-US` (bukan
 * `Date#getDay`, yang memakai zona waktu peramban) supaya pengunjung di WIB
 * maupun WIT melihat hari yang sama dengan yang dipakai peladen untuk
 * menentukan tanggal bisnis booking (BR-B-01).
 */
const weekdayKeyWita = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' })

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

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

/** Tanggal dan bulan terpisah untuk kalender mini pada kartu booking. */
export function formatDayNumberWita(iso: string): string {
  return dayNumberWita.format(new Date(iso))
}

export function formatMonthShortWita(iso: string): string {
  return monthShortWita.format(new Date(iso))
}

/** Nama hari singkat ("Sen", "Sel", …) untuk pil tanggal pada strip ketersediaan. */
export function formatWeekdayShortWita(iso: string): string {
  return weekdayShortWita.format(new Date(iso))
}

/** Indeks hari menurut WITA; 0 = Minggu, sama seperti `EXTRACT(DOW)`. */
export function witaWeekdayIndex(iso: string): number {
  return WEEKDAY_INDEX[weekdayKeyWita.format(new Date(iso))] ?? 0
}

/** Sabtu dan Minggu — dipakai untuk menandai pil tanggal, bukan untuk menghitung harga. */
export function isWitaWeekend(iso: string): boolean {
  const index = witaWeekdayIndex(iso)
  return index === 0 || index === 6
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
