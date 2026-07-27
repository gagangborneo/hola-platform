import { describe, expect, it } from 'vitest'
import { isoWeekKey, isoWeekOf } from './iso-week'

/** Instan UTC yang jatuh pada tengah hari WITA agar bebas dari ambiguitas batas hari. */
const witaNoon = (dateYmd: string): Date => new Date(`${dateYmd}T04:00:00Z`)

describe('isoWeekOf (ISO-8601, kalender WITA)', () => {
  const cases: Array<[string, number, number, string]> = [
    ['2026-01-01', 2026, 1, 'Kamis — 1 Jan 2026 jatuh di minggu 1'],
    ['2026-01-04', 2026, 1, 'Minggu — masih minggu 1'],
    ['2026-01-05', 2026, 2, 'Senin — minggu 2 dimulai'],
    ['2026-07-28', 2026, 31, 'Selasa'],
    ['2026-12-31', 2026, 53, 'Kamis — 2026 punya 53 minggu'],
    ['2025-01-01', 2025, 1, 'Rabu'],
    ['2024-12-30', 2025, 1, 'Senin — akhir Desember masuk minggu 1 TAHUN BERIKUTNYA'],
    ['2023-01-01', 2022, 52, 'Minggu — awal Januari masuk minggu 52 TAHUN SEBELUMNYA'],
    ['2021-01-04', 2021, 1, 'Senin'],
    ['2020-12-31', 2020, 53, 'Kamis'],
  ]

  it.each(cases)('%s → %i-W%i (%s)', (date, year, week) => {
    expect(isoWeekOf(witaNoon(date))).toEqual({ year, week })
  })

  it('minggu selalu 1..53', () => {
    for (let d = 0; d < 400; d++) {
      const instant = new Date(Date.UTC(2026, 0, 1) + d * 86_400_000)
      const { week } = isoWeekOf(instant)
      expect(week).toBeGreaterThanOrEqual(1)
      expect(week).toBeLessThanOrEqual(53)
    }
  })

  it('nomor minggu hanya berubah pada hari Senin WITA', () => {
    let previous = isoWeekOf(witaNoon('2026-01-01')).week
    for (let d = 1; d < 365; d++) {
      const instant = new Date(Date.UTC(2026, 0, 1, 4) + d * 86_400_000)
      const { week } = isoWeekOf(instant)
      const isMonday = new Date(instant.getTime() + 480 * 60_000).getUTCDay() === 1
      if (week !== previous) expect(isMonday, `berubah di hari non-Senin, d=${d}`).toBe(true)
      previous = week
    }
  })

  it('memakai kalender WITA, bukan UTC', () => {
    // 2026-01-04T17:00Z = 2026-01-05T01:00 WITA (Senin) → sudah minggu 2.
    expect(isoWeekOf(new Date('2026-01-04T17:00:00Z')).week).toBe(2)
    // 2026-01-04T15:00Z = 2026-01-04T23:00 WITA (Minggu) → masih minggu 1.
    expect(isoWeekOf(new Date('2026-01-04T15:00:00Z')).week).toBe(1)
  })
})

describe('isoWeekKey', () => {
  it('berformat YYYY-Www dengan minggu dua digit', () => {
    expect(isoWeekKey(witaNoon('2026-01-01'))).toBe('2026-W01')
    expect(isoWeekKey(witaNoon('2026-07-28'))).toBe('2026-W31')
    expect(isoWeekKey(witaNoon('2024-12-30'))).toBe('2025-W01')
  })
})
