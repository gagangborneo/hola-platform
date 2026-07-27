/**
 * Format tanggal & waktu WITA untuk presentasi.
 *
 * Timestamp lintas batas tetap UTC/ISO-8601 (docs/16 BR-TS-08); konversi WITA
 * hanya di lapisan presentasi. Tanpa `Intl` — lihat alasannya di `format/money.ts`.
 */
import { pad2, toWitaParts } from '../utils/wita'

const MONTHS_SHORT = [
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

const DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

function monthShort(month: number): string {
  const name = MONTHS_SHORT[month - 1]
  if (name === undefined) throw new Error(`Bulan di luar rentang: ${month}`)
  return name
}

/** `"Sabtu"` — nama hari WITA. */
export function formatWitaWeekday(instant: Date): string {
  const { weekday } = toWitaParts(instant)
  const name = DAYS_LONG[weekday]
  if (name === undefined) throw new Error(`Hari di luar rentang: ${weekday}`)
  return name
}

/** `"28 Jul 2026"` — tanggal WITA saja. */
export function formatWitaDate(instant: Date): string {
  const { year, month, day } = toWitaParts(instant)
  return `${day} ${monthShort(month)} ${year}`
}

/** `"19:00"` — jam WITA saja. */
export function formatWitaTime(instant: Date): string {
  const { hour, minute } = toWitaParts(instant)
  return `${pad2(hour)}:${pad2(minute)}`
}

/** `"28 Jul 2026, 19:00 WITA"` — bentuk lengkap default. */
export function formatWita(instant: Date): string {
  return `${formatWitaDate(instant)}, ${formatWitaTime(instant)} WITA`
}

/**
 * Rentang waktu, meringkas bila keduanya jatuh pada tanggal WITA yang sama:
 *   - sehari  : `"28 Jul 2026, 19:00–21:00 WITA"`
 *   - berbeda : `"28 Jul 2026, 23:00 – 29 Jul 2026, 01:00 WITA"`
 */
export function formatDateRange(start: Date, end: Date): string {
  const a = toWitaParts(start)
  const b = toWitaParts(end)
  const sameDay = a.year === b.year && a.month === b.month && a.day === b.day
  if (sameDay) {
    return `${formatWitaDate(start)}, ${formatWitaTime(start)}–${formatWitaTime(end)} WITA`
  }
  return `${formatWitaDate(start)}, ${formatWitaTime(start)} – ${formatWitaDate(end)}, ${formatWitaTime(end)} WITA`
}
