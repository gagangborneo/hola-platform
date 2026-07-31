import { describe, expect, it } from 'vitest'
import { assertBookingTransition, canTransitionBooking } from './booking-state.ts'

describe('P1-32 booking state machine', () => {
  it.each([
    [null, 'pending_payment', undefined],
    [null, 'confirmed', 'staff'],
    ['pending_payment', 'confirmed', undefined],
    ['pending_payment', 'expired', undefined],
    ['pending_payment', 'cancelled', undefined],
    ['confirmed', 'completed', undefined],
    ['confirmed', 'no_show', undefined],
    ['confirmed', 'cancelled', undefined],
    ['completed', 'cancelled', 'admin'],
  ] as const)('mengizinkan %s → %s untuk role %s', (from, to, role) => {
    expect(canTransitionBooking(from, to, role)).toBe(true)
  })

  it.each([
    ['expired', 'confirmed', 'admin'],
    ['cancelled', 'confirmed', 'admin'],
    ['no_show', 'completed', 'admin'],
    ['completed', 'confirmed', 'admin'],
    ['confirmed', 'pending_payment', 'admin'],
  ] as const)('menolak transisi terlarang %s → %s', (from, to, role) => {
    expect(() => assertBookingTransition(from, to, role)).toThrow(/tidak diizinkan/)
  })
})
