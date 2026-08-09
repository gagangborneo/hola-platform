import type { ReactNode } from 'react'
import { bookingStatusLabel, bookingUsageLabel } from '../../lib/status-labels.ts'
import { Badge, type BadgeProps } from '../ui/badge.tsx'

/** Menunggu pembayaran perlu menonjol karena ada tenggat; sisanya cukup netral. */
function statusVariant(status: string): BadgeProps['variant'] {
  if (status === 'confirmed' || status === 'completed') return 'default'
  if (status === 'pending_payment') return 'accent'
  return 'outline'
}

interface BookingStatusBadgesProps {
  status: string
  checkedInAt: string | null
}

/**
 * Pasangan lencana status booking + status pemakaian, dipakai daftar booking
 * maupun halaman detail supaya booking yang sama tidak pernah tampil dengan
 * status berbeda di dua layar.
 */
export function BookingStatusBadges({ status, checkedInAt }: BookingStatusBadgesProps): ReactNode {
  const usage = bookingUsageLabel({ status, checked_in_at: checkedInAt })

  return (
    <>
      <Badge variant={statusVariant(status)}>{bookingStatusLabel(status)}</Badge>
      {usage ? (
        <Badge variant={usage.tone === 'used' ? 'secondary' : 'outline'}>{usage.label}</Badge>
      ) : null}
    </>
  )
}
