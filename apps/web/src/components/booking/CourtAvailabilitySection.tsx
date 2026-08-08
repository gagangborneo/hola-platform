'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { Button } from '../ui/button.tsx'
import { AvailabilityGrid, type AvailabilitySlot } from './AvailabilityGrid.tsx'

interface CourtAvailabilitySectionProps {
  courtId: string
  horizonDays: number
  serverTime: string
}

export function CourtAvailabilitySection({
  courtId,
  horizonDays,
  serverTime,
}: CourtAvailabilitySectionProps): ReactNode {
  const router = useRouter()
  const [selected, setSelected] = useState<AvailabilitySlot[]>([])
  const onSelectionChange = useCallback((slots: AvailabilitySlot[]) => setSelected(slots), [])

  const goToCheckout = (): void => {
    const slots = selected.map((slot) => slot.starts_at).join(',')
    router.push(`/checkout?court=${courtId}&slots=${encodeURIComponent(slots)}`)
  }

  return (
    <>
      <AvailabilityGrid
        courtId={courtId}
        horizonDays={horizonDays}
        serverTime={serverTime}
        onSelectionChange={onSelectionChange}
      />
      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{selected.length} slot dipilih</p>
        <Button disabled={selected.length === 0} onClick={goToCheckout}>
          Lanjut ke checkout
        </Button>
      </div>
    </>
  )
}
