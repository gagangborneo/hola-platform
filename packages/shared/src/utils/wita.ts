/**
 * Primitif zona waktu bisnis (WITA / Asia/Makassar).
 *
 * WITA adalah **UTC+8 tetap, tanpa DST**, jadi konversinya murni aritmetika dan
 * tidak butuh Intl atau database timezone — penting karena packages/shared harus
 * jalan di React Native (docs/01-ARCHITECTURE.md § 3.6) dan karena test wajib
 * deterministik (docs/16 BR-TT-10).
 *
 * Seluruh timestamp lintas batas tetap UTC (`Date` / ISO 8601, BR-TS-08).
 * Konversi WITA hanya untuk presentasi dan untuk menentukan **tanggal bisnis**.
 */

/** Selisih WITA terhadap UTC, dalam menit. Asia/Makassar = UTC+8, tanpa DST. */
export const WITA_OFFSET_MINUTES = 480

const MS_PER_MINUTE = 60_000

export interface WitaParts {
  year: number
  month: number // 1–12
  day: number // 1–31
  hour: number // 0–23
  minute: number // 0–59
  second: number // 0–59
  /** 0 = Minggu … 6 = Sabtu, mengikuti `Date.prototype.getUTCDay`. */
  weekday: number
}

/** Pecah sebuah instan menjadi komponen kalender WITA-nya. */
export function toWitaParts(instant: Date): WitaParts {
  const shifted = new Date(instant.getTime() + WITA_OFFSET_MINUTES * MS_PER_MINUTE)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay(),
  }
}

/** Tanggal bisnis (`YYYY-MM-DD`) tempat sebuah instan jatuh menurut WITA. */
export function witaDateYmd(instant: Date): string {
  const { year, month, day } = toWitaParts(instant)
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}`
}

/**
 * Ubah tanggal + jam WITA menjadi instan UTC.
 *
 * @param dateYmd `YYYY-MM-DD` menurut kalender WITA
 * @param minutesFromMidnight menit sejak 00:00 WITA (boleh ≥ 1440 untuk melewati
 *        tengah malam, mis. jam tutup `24:00`)
 */
export function witaToInstant(dateYmd: string, minutesFromMidnight: number): Date {
  const { year, month, day } = parseDateYmd(dateYmd)
  const utcMidnight = Date.UTC(year, month - 1, day)
  return new Date(utcMidnight + (minutesFromMidnight - WITA_OFFSET_MINUTES) * MS_PER_MINUTE)
}

/** Urai `HH:mm` menjadi menit sejak tengah malam. Menerima `24:00`. */
export function parseTimeToMinutes(time: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(time)
  if (!m?.[1] || !m[2]) {
    throw new Error(`Jam harus berformat HH:mm, diterima: ${time}`)
  }
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) {
    throw new Error(`Jam di luar rentang yang sah: ${time}`)
  }
  return hour * 60 + minute
}

/** Kebalikan `parseTimeToMinutes`. */
export function formatMinutesAsTime(minutesFromMidnight: number): string {
  const total = ((minutesFromMidnight % 1440) + 1440) % 1440
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}

export function parseDateYmd(dateYmd: string): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd)
  if (!m?.[1] || !m[2] || !m[3]) {
    throw new Error(`Tanggal harus berformat YYYY-MM-DD, diterima: ${dateYmd}`)
  }
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Tanggal di luar rentang yang sah: ${dateYmd}`)
  }
  return { year, month, day }
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function pad4(n: number): string {
  return String(n).padStart(4, '0')
}
