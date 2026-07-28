/**
 * Grid slot lapangan — fungsi **pure**.
 *
 * Sumber kebenaran: docs/03-DATA-MODEL.md § 8.2.
 *
 *   - Identitas slot = pasangan `(court_id, starts_at)`.
 *   - Panjang slot = `courts.slot_duration_minutes` (v1: 60 menit).
 *   - `starts_at` wajib rata grid:
 *       starts_at = (tanggal WITA + opens_time) + n × slot_duration_minutes,
 *     dengan n bilangan bulat ≥ 0, dan `ends_at ≤ closes_time` pada hari itu.
 *   - Tidak rata → ditolak `422 SLOT_NOT_ALIGNED`.
 *   - `ends_at` SELALU `starts_at + slot_duration_minutes`.
 *
 * Karena slot selalu rata grid dan panjangnya seragam per court, membandingkan
 * `starts_at` saja sudah cukup untuk menentukan tumpang-tindih — itulah yang
 * membuat anti double-booking cukup memakai satu partial unique index (C-1).
 *
 * Tidak ada `new Date()` di file ini: fungsi yang bergantung waktu menerima
 * `now` sebagai parameter (docs/16 BR-TS-10).
 */
import { parseTimeToMinutes, witaDateYmd, witaToInstant } from './wita.ts'

const MS_PER_MINUTE = 60_000

export interface CourtGrid {
  /** `courts.slot_duration_minutes`. */
  slotDurationMinutes: number
  /** `court_operating_hours.opens_time`, format `HH:mm` WITA. */
  opensTime: string
  /** `court_operating_hours.closes_time`, format `HH:mm` WITA. Menerima `24:00`. */
  closesTime: string
}

export interface Slot {
  startsAt: Date
  endsAt: Date
}

function assertGrid(grid: CourtGrid): { opens: number; closes: number } {
  if (!Number.isInteger(grid.slotDurationMinutes) || grid.slotDurationMinutes <= 0) {
    throw new Error(
      `slot_duration_minutes harus bilangan bulat > 0, diterima: ${grid.slotDurationMinutes}`,
    )
  }
  const opens = parseTimeToMinutes(grid.opensTime)
  const closes = parseTimeToMinutes(grid.closesTime)
  if (closes <= opens) {
    throw new Error(`closes_time (${grid.closesTime}) harus setelah opens_time (${grid.opensTime})`)
  }
  return { opens, closes }
}

/**
 * Apakah `startsAt` rata terhadap grid court pada tanggal bisnis WITA-nya
 * sendiri, dan slot penuhnya masih di dalam jam operasional?
 *
 * Mengembalikan `false` (bukan melempar) untuk slot yang tidak rata — pemanggil
 * yang menerjemahkannya menjadi `422 SLOT_NOT_ALIGNED`.
 */
export function isSlotAligned(startsAt: Date, grid: CourtGrid): boolean {
  const { opens, closes } = assertGrid(grid)
  const dateYmd = witaDateYmd(startsAt)
  const origin = witaToInstant(dateYmd, opens)

  const offsetMinutes = (startsAt.getTime() - origin.getTime()) / MS_PER_MINUTE
  if (!Number.isInteger(offsetMinutes) || offsetMinutes < 0) return false
  if (offsetMinutes % grid.slotDurationMinutes !== 0) return false

  // ends_at ≤ closes_time pada hari yang sama.
  return opens + offsetMinutes + grid.slotDurationMinutes <= closes
}

/** `ends_at` sebuah slot. Selalu `starts_at + slot_duration_minutes`. */
export function slotEndsAt(startsAt: Date, slotDurationMinutes: number): Date {
  return new Date(startsAt.getTime() + slotDurationMinutes * MS_PER_MINUTE)
}

/**
 * Seluruh slot pada satu tanggal bisnis WITA, urut menaik.
 *
 * Slot terakhir yang `ends_at`-nya melewati `closes_time` TIDAK disertakan —
 * lapangan tidak menjual waktu yang tidak dimilikinya.
 */
export function buildSlotGrid(dateYmd: string, grid: CourtGrid): Slot[] {
  const { opens, closes } = assertGrid(grid)
  const slots: Slot[] = []
  for (let m = opens; m + grid.slotDurationMinutes <= closes; m += grid.slotDurationMinutes) {
    const startsAt = witaToInstant(dateYmd, m)
    slots.push({ startsAt, endsAt: slotEndsAt(startsAt, grid.slotDurationMinutes) })
  }
  return slots
}

/**
 * Apakah daftar slot berurutan tanpa celah? Dipakai `require_contiguous_slots`
 * (docs/06 BR-B-09). Daftar kosong atau satu slot dianggap berurutan.
 */
export function areSlotsContiguous(startsAtList: Date[], slotDurationMinutes: number): boolean {
  if (startsAtList.length <= 1) return true
  const sorted = [...startsAtList].sort((a, b) => a.getTime() - b.getTime())
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev === undefined || curr === undefined) return false
    if (curr.getTime() - prev.getTime() !== slotDurationMinutes * MS_PER_MINUTE) return false
  }
  return true
}
