import { describe, expect, it } from 'vitest'
import { formatRemaining, remainingMs } from './hold-countdown.ts'

const holdExpiresAt = '2026-08-10T06:10:00+08:00'
/** Jam peladen: 6 menit tersisa. */
const serverNowMs = new Date('2026-08-10T06:04:00+08:00').getTime()

describe('countdown hold', () => {
  it('E-23: jam klien yang meleset 5 menit tidak mengubah sisa waktu', () => {
    const clientNow = serverNowMs - 5 * 60_000
    const offsetMs = serverNowMs - clientNow

    expect(remainingMs(holdExpiresAt, clientNow, offsetMs)).toBe(6 * 60_000)
  })

  it('E-23: jam klien yang mendahului juga dikoreksi', () => {
    const clientNow = serverNowMs + 5 * 60_000
    const offsetMs = serverNowMs - clientNow

    expect(remainingMs(holdExpiresAt, clientNow, offsetMs)).toBe(6 * 60_000)
  })

  it('offset nol berarti jam klien dipercaya apa adanya', () => {
    expect(remainingMs(holdExpiresAt, serverNowMs, 0)).toBe(6 * 60_000)
  })

  it('hold yang sudah lewat tidak menghasilkan angka negatif', () => {
    const afterExpiry = new Date('2026-08-10T06:20:00+08:00').getTime()

    expect(remainingMs(holdExpiresAt, afterExpiry, 0)).toBe(0)
  })

  it('format mm:ss dengan nol di depan', () => {
    expect(formatRemaining(9 * 60_000 + 5_000)).toBe('09:05')
    expect(formatRemaining(0)).toBe('00:00')
    expect(formatRemaining(600_000)).toBe('10:00')
  })
})
