/** State machine booking yang murni; efek samping ditangani booking.service. */
import type { BookingStatus, UserRole } from '@hola/shared'
import { err } from '../../lib/errors.ts'

export type BookingTransitionFrom = BookingStatus | null

const ALLOWED_TRANSITIONS: Readonly<
  Record<Exclude<BookingStatus, 'pending_payment'>, readonly BookingStatus[]>
> = {
  cancelled: [],
  completed: ['cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  expired: [],
  no_show: [],
}

export function canTransitionBooking(
  from: BookingTransitionFrom,
  to: BookingStatus,
  actorRole: UserRole | undefined,
): boolean {
  if (from === null) return to === 'pending_payment' || to === 'confirmed'
  if (from === 'pending_payment')
    return to === 'confirmed' || to === 'expired' || to === 'cancelled'
  if (from === 'completed' && to === 'cancelled') return actorRole === 'admin'
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** Menolak semua transisi terminal/mundur kecuali koreksi completed oleh admin. */
export function assertBookingTransition(
  from: BookingTransitionFrom,
  to: BookingStatus,
  actorRole: UserRole | undefined,
): void {
  if (!canTransitionBooking(from, to, actorRole)) {
    throw err.conflict('Transisi status booking tidak diizinkan.', { from, to })
  }
}
