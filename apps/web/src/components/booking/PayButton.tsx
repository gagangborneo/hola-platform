'use client'

import type { ReactNode } from 'react'
import { Button } from '../ui/button.tsx'

interface PayButtonProps {
  bookingId: string
  midtransClientKey: string
}

/**
 * PLACEHOLDER — Task 15 replaces this with the real Midtrans Snap integration.
 * Deliberately does nothing but render a disabled button so `BookingHoldPanel`
 * (Task 14) compiles; no payment logic lives here.
 */
export function PayButton({ bookingId, midtransClientKey }: PayButtonProps): ReactNode {
  return (
    <Button
      className="mt-6 w-full"
      disabled
      data-booking-id={bookingId}
      data-has-client-key={Boolean(midtransClientKey)}
    >
      Bayar sekarang (segera hadir)
    </Button>
  )
}
