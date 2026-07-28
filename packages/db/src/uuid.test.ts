import { describe, expect, it } from 'vitest'
import { uuidv7, uuidv7Timestamp } from './uuid.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe('uuidv7 (RFC 9562 § 5.7, docs/03 § 2)', () => {
  it('berbentuk UUID yang sah', () => {
    expect(uuidv7()).toMatch(UUID_RE)
  })

  it('nomor versinya 7, bukan 4', () => {
    for (let i = 0; i < 100; i++) {
      expect(uuidv7().charAt(14)).toBe('7')
    }
  })

  it('varian RFC 4122 (2 bit teratas oktet 8 = 0b10)', () => {
    for (let i = 0; i < 100; i++) {
      expect('89ab').toContain(uuidv7().charAt(19))
    }
  })

  it('membawa timestamp yang disuntikkan', () => {
    const at = Date.UTC(2026, 6, 28, 12, 0, 0)
    expect(uuidv7Timestamp(uuidv7(at))).toBe(at)
  })

  it('terurut secara leksikografis mengikuti waktu — inilah alasan memilih v7', () => {
    // Properti yang membuat PK v7 murah untuk range scan: urutan string sama
    // dengan urutan waktu. UUID v4 acak tidak punya properti ini.
    const ids = [
      uuidv7(Date.UTC(2026, 0, 1)),
      uuidv7(Date.UTC(2026, 5, 1)),
      uuidv7(Date.UTC(2026, 11, 31)),
    ]
    expect([...ids].sort()).toEqual(ids)
  })

  it('tidak tabrakan pada milidetik yang sama (74 bit acak)', () => {
    const at = Date.UTC(2026, 6, 28)
    const ids = new Set(Array.from({ length: 10_000 }, () => uuidv7(at)))
    expect(ids.size).toBe(10_000)
  })

  it('menangani timestamp besar tanpa kehilangan presisi (> 2^32 ms)', () => {
    const at = Date.UTC(2099, 0, 1)
    expect(uuidv7Timestamp(uuidv7(at))).toBe(at)
  })
})
