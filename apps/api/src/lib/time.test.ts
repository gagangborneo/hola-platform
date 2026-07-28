import { describe, expect, it } from 'vitest'
import {
  addMinutes,
  addSeconds,
  buildSlotGrid,
  isPast,
  isSlotAligned,
  witaDateYmd,
} from './time.ts'

describe('server time helpers', () => {
  it('BR-TS-10: helper waktu memakai instan yang disuntikkan', () => {
    const now = new Date('2026-07-27T16:30:00.000Z')
    expect(witaDateYmd(now)).toBe('2026-07-28')
    expect(addMinutes(now, 15).toISOString()).toBe('2026-07-27T16:45:00.000Z')
    expect(addSeconds(now, 30).toISOString()).toBe('2026-07-27T16:30:30.000Z')
    expect(isPast(new Date('2026-07-27T16:29:59.000Z'), now)).toBe(true)
  })

  it('F0-37: lib/time menjadi pintu WITA dan grid slot server', () => {
    const grid = { slotDurationMinutes: 60, opensTime: '08:00', closesTime: '10:00' }
    const slots = buildSlotGrid('2026-07-28', grid)
    expect(slots).toHaveLength(2)
    expect(isSlotAligned(slots[0]?.startsAt ?? new Date(0), grid)).toBe(true)
  })
})
