import { describe, expect, it } from 'vitest'
import { parseDateRange } from './date-range.ts'
import { MAX_RANGE_DAYS } from './operations.ts'

const base = { from: '2026-08-01', to: '2026-08-07' }

describe('validasi rentang tanggal dashboard', () => {
  it('meneruskan rentang yang sah apa adanya', () => {
    const result = parseDateRange({ from: '2026-08-03', to: '2026-08-09' }, base)
    expect(result.error).toBeNull()
    expect(result.range).toEqual({ from: '2026-08-03', to: '2026-08-09' })
  })

  it('menahan rentang di tanggal lama saat tanggalnya belum lengkap diketik', () => {
    const result = parseDateRange({ from: '', to: base.to }, base)
    expect(result.error).toBe('invalid-date')
    expect(result.range).toEqual(base)
  })

  it('sisi yang baru diubah menang saat rentangnya terbalik', () => {
    const fromMoved = parseDateRange({ from: '2026-08-20', to: base.to }, base)
    expect(fromMoved.error).toBe('reversed')
    expect(fromMoved.range).toEqual({ from: '2026-08-20', to: '2026-08-20' })

    const toMoved = parseDateRange({ from: base.from, to: '2026-07-20' }, base)
    expect(toMoved.error).toBe('reversed')
    expect(toMoved.range).toEqual({ from: '2026-07-20', to: '2026-07-20' })
  })

  it(`memotong rentang yang melebihi ${MAX_RANGE_DAYS} hari, bukan menolaknya`, () => {
    const result = parseDateRange({ from: '2026-01-01', to: '2026-12-31' }, base)
    expect(result.error).toBe('too-wide')
    // `to` yang berubah → `from` ditarik mendekat, dan lebarnya pas di batas.
    expect(result.range.to).toBe('2026-12-31')
    expect(result.range.from).toBe('2026-10-01')
  })

  it('rentang tepat sebesar batas masih diterima', () => {
    const result = parseDateRange({ from: '2026-10-01', to: '2026-12-31' }, base)
    expect(result.error).toBeNull()
  })
})
