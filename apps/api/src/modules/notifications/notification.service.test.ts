import { describe, expect, it } from 'vitest'
import { nextPushDeliveryAt } from './notification.service.ts'

describe('quiet hours notifikasi', () => {
  it('F0-60: push non-transaksional 22:00–07:00 WITA ditunda hingga jam 07:00', () => {
    // 22:30 WITA pada 29 Juli → 07:00 WITA pada hari berikutnya.
    expect(nextPushDeliveryAt(new Date('2026-07-29T14:30:00.000Z'), false)?.toISOString()).toBe(
      '2026-07-29T23:00:00.000Z',
    )
    // Notifikasi transaksional tidak pernah ditunda.
    expect(nextPushDeliveryAt(new Date('2026-07-29T14:30:00.000Z'), true)).toBeUndefined()
  })
})
