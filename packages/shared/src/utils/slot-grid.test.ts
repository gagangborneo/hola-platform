import { describe, expect, it } from 'vitest'
import { areSlotsContiguous, buildSlotGrid, isSlotAligned, slotEndsAt } from './slot-grid.ts'
import { witaDateYmd, witaToInstant } from './wita.ts'

/** Court seed: buka 06:00–23:00 WITA, slot 60 menit (docs/02 § 11 seed). */
const GRID = { slotDurationMinutes: 60, opensTime: '06:00', closesTime: '23:00' }
const HALF_HOUR_GRID = { slotDurationMinutes: 30, opensTime: '06:00', closesTime: '08:00' }

/** 06:00 WITA = 22:00 UTC hari sebelumnya. */
const wita = (dateYmd: string, hhmm: string): Date => {
  const [h, m] = hhmm.split(':')
  return witaToInstant(dateYmd, Number(h) * 60 + Number(m))
}

describe('wita ↔ UTC', () => {
  it('06:00 WITA = 22:00 UTC hari sebelumnya (UTC+8, tanpa DST)', () => {
    expect(wita('2026-08-04', '06:00').toISOString()).toBe('2026-08-03T22:00:00.000Z')
  })

  it('tanggal bisnis WITA memakai kalender WITA, bukan UTC', () => {
    // 23:30 UTC tanggal 3 = 07:30 WITA tanggal 4.
    expect(witaDateYmd(new Date('2026-08-03T23:30:00Z'))).toBe('2026-08-04')
  })
})

describe('isSlotAligned (docs/03 § 8.2)', () => {
  it('slot tepat di jam buka rata grid (n = 0)', () => {
    expect(isSlotAligned(wita('2026-08-04', '06:00'), GRID)).toBe(true)
  })

  it.each(['07:00', '12:00', '22:00'])('slot %s rata grid', (t) => {
    expect(isSlotAligned(wita('2026-08-04', t), GRID)).toBe(true)
  })

  it.each(['06:30', '07:15', '06:01'])('slot %s TIDAK rata grid → SLOT_NOT_ALIGNED', (t) => {
    expect(isSlotAligned(wita('2026-08-04', t), GRID)).toBe(false)
  })

  it('slot sebelum jam buka tidak rata (n negatif)', () => {
    expect(isSlotAligned(wita('2026-08-04', '05:00'), GRID)).toBe(false)
  })

  it('slot yang ends_at-nya melewati closes_time ditolak', () => {
    // 23:00 buka..tutup: slot 22:00 berakhir 23:00 (boleh), 23:00 berakhir 24:00 (tidak).
    expect(isSlotAligned(wita('2026-08-04', '22:00'), GRID)).toBe(true)
    expect(isSlotAligned(wita('2026-08-04', '23:00'), GRID)).toBe(false)
  })

  it('grid 30 menit menerima :30', () => {
    expect(isSlotAligned(wita('2026-08-04', '06:30'), HALF_HOUR_GRID)).toBe(true)
  })

  it('menolak konfigurasi grid yang tidak masuk akal', () => {
    expect(() => isSlotAligned(new Date(), { ...GRID, slotDurationMinutes: 0 })).toThrow()
    expect(() => isSlotAligned(new Date(), { ...GRID, closesTime: '06:00' })).toThrow()
  })
})

describe('buildSlotGrid (docs/03 § 8.2)', () => {
  it('06:00–23:00 dengan slot 60 menit menghasilkan 17 slot', () => {
    const slots = buildSlotGrid('2026-08-04', GRID)
    expect(slots).toHaveLength(17)
    expect(slots[0]?.startsAt.toISOString()).toBe('2026-08-03T22:00:00.000Z')
    expect(slots.at(-1)?.startsAt.toISOString()).toBe('2026-08-04T14:00:00.000Z')
  })

  it('slot terakhir berakhir tepat di closes_time, tidak melewatinya', () => {
    const last = buildSlotGrid('2026-08-04', GRID).at(-1)
    expect(last?.endsAt.toISOString()).toBe(wita('2026-08-04', '23:00').toISOString())
  })

  it('ends_at selalu starts_at + slot_duration_minutes', () => {
    for (const s of buildSlotGrid('2026-08-04', GRID)) {
      expect(s.endsAt.getTime() - s.startsAt.getTime()).toBe(60 * 60_000)
    }
  })

  it('setiap slot yang dihasilkan lolos isSlotAligned', () => {
    for (const s of buildSlotGrid('2026-08-04', GRID)) {
      expect(isSlotAligned(s.startsAt, GRID)).toBe(true)
    }
  })

  it('urut menaik tanpa celah', () => {
    const slots = buildSlotGrid('2026-08-04', GRID)
    expect(
      areSlotsContiguous(
        slots.map((s) => s.startsAt),
        60,
      ),
    ).toBe(true)
  })

  it('grid 30 menit 06:00–08:00 menghasilkan 4 slot', () => {
    expect(buildSlotGrid('2026-08-04', HALF_HOUR_GRID)).toHaveLength(4)
  })

  it('deterministik — dipanggil dua kali hasilnya identik', () => {
    expect(buildSlotGrid('2026-08-04', GRID)).toEqual(buildSlotGrid('2026-08-04', GRID))
  })
})

describe('slotEndsAt', () => {
  it('menambahkan durasi slot', () => {
    const s = wita('2026-08-04', '19:00')
    expect(slotEndsAt(s, 60).toISOString()).toBe(wita('2026-08-04', '20:00').toISOString())
  })
})

describe('areSlotsContiguous (docs/06 BR-B-09)', () => {
  it('daftar kosong & satu slot dianggap berurutan', () => {
    expect(areSlotsContiguous([], 60)).toBe(true)
    expect(areSlotsContiguous([wita('2026-08-04', '19:00')], 60)).toBe(true)
  })

  it('19:00 + 20:00 berurutan', () => {
    const list = [wita('2026-08-04', '19:00'), wita('2026-08-04', '20:00')]
    expect(areSlotsContiguous(list, 60)).toBe(true)
  })

  it('19:00 + 21:00 TIDAK berurutan (ada celah 20:00)', () => {
    const list = [wita('2026-08-04', '19:00'), wita('2026-08-04', '21:00')]
    expect(areSlotsContiguous(list, 60)).toBe(false)
  })

  it('urutan masukan tidak berpengaruh', () => {
    const list = [wita('2026-08-04', '20:00'), wita('2026-08-04', '19:00')]
    expect(areSlotsContiguous(list, 60)).toBe(true)
  })

  it('tidak memodifikasi array masukan', () => {
    const a = wita('2026-08-04', '20:00')
    const b = wita('2026-08-04', '19:00')
    const list = [a, b]
    areSlotsContiguous(list, 60)
    expect(list).toEqual([a, b])
  })
})
