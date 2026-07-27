/**
 * Nomor minggu ISO-8601, dihitung terhadap kalender WITA.
 *
 * Dibuat sekarang meskipun pemakainya (`WEEKLY_STREAK`, docs/12) baru hidup di
 * Phase 3 — supaya tidak muncul helper waktu kedua yang menghitung minggu dengan
 * cara berbeda (F0-16).
 *
 * Aturan ISO-8601:
 *   - Minggu dimulai hari **Senin**.
 *   - Minggu ke-1 sebuah tahun adalah minggu yang memuat **Kamis** pertama,
 *     ekuivalen: minggu yang memuat 4 Januari.
 *   - Karena itu tanggal di akhir Desember bisa masuk minggu 1 tahun berikutnya,
 *     dan awal Januari bisa masuk minggu 52/53 tahun sebelumnya. `isoWeekYear`
 *     karena itu TIDAK selalu sama dengan tahun kalender.
 *
 * Pure, tanpa `new Date()` internal (docs/16 BR-TS-10).
 */
import { pad2, toWitaParts } from './wita'

export interface IsoWeek {
  /** Tahun ISO — bisa berbeda dari tahun kalender di pergantian tahun. */
  year: number
  /** Nomor minggu, 1–53. */
  week: number
}

/**
 * Hari dalam minggu menurut ISO: Senin = 1 … Minggu = 7.
 * (`Date.prototype.getUTCDay` memakai Minggu = 0.)
 */
function isoWeekday(weekday: number): number {
  return weekday === 0 ? 7 : weekday
}

/** Nomor & tahun minggu ISO dari sebuah instan, menurut kalender WITA. */
export function isoWeekOf(instant: Date): IsoWeek {
  const { year, month, day, weekday } = toWitaParts(instant)

  // Geser ke hari Kamis pada minggu yang sama: tahun ISO ditentukan oleh Kamis
  // itu, dan nomor minggunya adalah urutan Kamis tersebut dalam tahun ISO.
  const thursday = Date.UTC(year, month - 1, day - isoWeekday(weekday) + 4)
  const isoYear = new Date(thursday).getUTCFullYear()

  const jan4 = Date.UTC(isoYear, 0, 4)
  const jan4Weekday = isoWeekday(new Date(jan4).getUTCDay())
  const week1Monday = jan4 - (jan4Weekday - 1) * 86_400_000

  const week = Math.round((thursday - week1Monday) / (7 * 86_400_000)) + 1
  return { year: isoYear, week }
}

/** Representasi kanonik `YYYY-Www`, mis. `2026-W31`. Dipakai sebagai kunci periode. */
export function isoWeekKey(instant: Date): string {
  const { year, week } = isoWeekOf(instant)
  return `${year}-W${pad2(week)}`
}
