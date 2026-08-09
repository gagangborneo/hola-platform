/**
 * Pemformatan tampilan back-office.
 *
 * Hanya memformat. Tidak menjumlah, mengali, atau membulatkan — seluruh angka
 * rupiah datang jadi dari API (BR-B-12). Zona bisnis dikunci ke WITA lewat
 * opsi `timeZone`, bukan zona mesin operator.
 */
import {
  formatMinutesAsTime,
  parseTimeToMinutes,
  toWitaParts,
  witaDateYmd,
  witaToInstant,
} from '@hola/shared'

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

const shortDateWita = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeWita = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

export function formatRupiah(amount: number): string {
  return rupiah.format(amount).replace(/\s/g, '')
}

export function formatTimeWita(iso: string): string {
  return timeWita.format(new Date(iso))
}

export function formatDateWita(iso: string): string {
  return dateWita.format(new Date(iso))
}

export function formatShortDateWita(iso: string): string {
  return shortDateWita.format(new Date(iso))
}

export function formatDateTimeWita(iso: string): string {
  return dateTimeWita.format(new Date(iso))
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

/** Rentang jam satu slot, mis. `07.00–08.00`. */
export function formatSlotRange(startsAt: string, endsAt: string): string {
  return `${formatTimeWita(startsAt)}–${formatTimeWita(endsAt)}`
}

/** Tanggal bisnis WITA hari ini. Menerima `now` agar pemanggil tetap deterministik. */
export function todayWita(now: Date): string {
  return witaDateYmd(now)
}

/** Menggeser tanggal bisnis `YYYY-MM-DD` sejumlah hari, tetap dalam kalender WITA. */
export function shiftDateKey(dateKey: string, days: number): string {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number)
  return witaDateYmd(new Date(Date.UTC(year, month - 1, day + days, 12)))
}

/** Hari dalam minggu (0 = Minggu) untuk sebuah tanggal bisnis WITA. */
export function dayOfWeekFor(dateKey: string): number {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number)
  return toWitaParts(new Date(Date.UTC(year, month - 1, day, 12))).weekday
}

/**
 * `HH:mm` yang dipakai `<input type="time">` dari kolom `time` PostgreSQL —
 * `24:00` dipertahankan apa adanya karena sah sebagai jam tutup.
 */
export function toTimeInputValue(time: string): string {
  const [hour = '00', minute = '00'] = time.split(':')
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

/** Menambah menit pada `HH:mm`; dipakai untuk menghitung akhir rentang maintenance. */
export function addMinutesToClock(time: string, minutes: number): string {
  return formatMinutesAsTime(parseTimeToMinutes(time) + minutes)
}

/**
 * `<input type="datetime-local">` bekerja dalam zona mesin operator, sedangkan
 * jadwal bisnis selalu WITA. Kedua fungsi ini menerjemahkan bolak-balik supaya
 * "berlaku sampai 23:00" berarti 23:00 WITA di mana pun laptopnya berada —
 * bukan 23:00 menurut zona sistem yang kebetulan aktif.
 */
export function witaLocalToIso(value: string): string {
  const [datePart = '', timePart = '00:00'] = value.split('T')
  return witaToInstant(datePart, parseTimeToMinutes(timePart.slice(0, 5))).toISOString()
}

export function isoToWitaLocal(iso: string): string {
  const parts = toWitaParts(new Date(iso))
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}
