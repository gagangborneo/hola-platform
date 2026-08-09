/**
 * Jembatan antara tanggal kalender `YYYY-MM-DD` dan `Date` milik react-day-picker.
 *
 * Konversinya sengaja lewat tengah hari waktu lokal. `new Date('2026-08-01')`
 * diurai sebagai UTC tengah malam, lalu di zona mana pun yang di belakang UTC ia
 * kembali menjadi 31 Juli — bug geser-satu-hari yang muncul hanya di sebagian
 * zona waktu dan karenanya paling mudah lolos dari pengujian. Tengah hari
 * memberi jarak 12 jam ke kedua batas hari, jadi tidak ada offset zona atau
 * pergeseran DST yang bisa memindahkan tanggalnya.
 */

const PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isCalendarDate(value: string): boolean {
  return PATTERN.test(value)
}

/** `YYYY-MM-DD` → `Date` tengah hari lokal. Nilai tak sah menghasilkan `undefined`. */
export function toDate(value: string | undefined): Date | undefined {
  if (value === undefined || !isCalendarDate(value)) return undefined
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** `Date` → `YYYY-MM-DD` memakai komponen lokal, bukan `toISOString()`. */
export function toCalendarDate(date: Date | undefined): string | undefined {
  if (date === undefined || Number.isNaN(date.getTime())) return undefined
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
