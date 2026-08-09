'use client'

import { Button } from '@hola/ui'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { AvailabilityGrid, type AvailabilitySlot } from './AvailabilityGrid.tsx'
import { type CourtLimits, validateSelection } from './checkout-validation.ts'

interface CourtAvailabilitySectionProps {
  courtId: string
  horizonDays: number
  serverTime: string
  minSlotsPerBooking: number
  maxSlotsPerBooking: number
  slotDurationMinutes: number
  requireContiguousSlots: boolean
  /** I2: tanggal yang harus dipilihkan saat kembali dari `SLOT_ALREADY_CLAIMED`. */
  initialDate?: string
  /** I2: banner "slot baru saja diambil orang lain", dari `?diambil=1`. */
  slotConflictNotice?: boolean
}

export function CourtAvailabilitySection({
  courtId,
  horizonDays,
  serverTime,
  minSlotsPerBooking,
  maxSlotsPerBooking,
  slotDurationMinutes,
  requireContiguousSlots,
  initialDate,
  slotConflictNotice = false,
}: CourtAvailabilitySectionProps): ReactNode {
  const router = useRouter()
  const [selected, setSelected] = useState<AvailabilitySlot[]>([])
  const onSelectionChange = useCallback((slots: AvailabilitySlot[]) => setSelected(slots), [])

  const limits = useMemo<CourtLimits[]>(
    () => [
      { courtId, minSlots: minSlotsPerBooking, maxSlots: maxSlotsPerBooking, slotDurationMinutes },
    ],
    [courtId, minSlotsPerBooking, maxSlotsPerBooking, slotDurationMinutes],
  )

  /**
   * C1: cermin aturan yang sama dengan `/checkout` (`checkout-validation.ts`,
   * BR-B-02/BR-B-09) lewat `validateSelection` yang sama persis — bukan
   * duplikat aturan. Sebelumnya tombol ini hanya memeriksa `selected.length >
   * 0`, jadi memilih 5 slot di court ber-`max_slots_per_booking` 4 (atau slot
   * tak berurutan saat venue mewajibkan kontiguitas) membawa customer ke
   * checkout tanpa harga, tanpa tombol bayar — dan tanpa jalan kembali selain
   * tombol back browser.
   */
  const selectionError = validateSelection({
    slots: selected.map((slot) => ({ courtId, startsAt: slot.starts_at })),
    limits,
    requireContiguousSlots,
  })
  // "Pilih minimal satu slot" bukan kesalahan yang perlu diumumkan di sini — itu keadaan
  // awal yang sudah jelas dari teks "0 slot dipilih" di sebelah tombol.
  const rangeError =
    selectionError && selectionError.code !== 'EMPTY_SELECTION' ? selectionError : null

  const goToCheckout = (): void => {
    const slots = selected.map((slot) => slot.starts_at).join(',')
    router.push(`/checkout?court=${courtId}&slots=${encodeURIComponent(slots)}`)
  }

  return (
    <>
      {slotConflictNotice ? (
        <p className="mb-4 rounded-xl bg-secondary p-4 text-secondary-foreground">
          Slot yang kamu pilih sebelumnya baru saja diambil orang lain. Pilih slot lain di tanggal
          ini, ya.
        </p>
      ) : null}
      <AvailabilityGrid
        courtId={courtId}
        horizonDays={horizonDays}
        serverTime={serverTime}
        onSelectionChange={onSelectionChange}
        {...(initialDate ? { initialDate } : {})}
      />
      {rangeError ? (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">
          {rangeError.message}
        </p>
      ) : null}
      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{selected.length} slot dipilih</p>
        <Button disabled={selectionError !== null} onClick={goToCheckout}>
          Lanjut ke checkout
        </Button>
      </div>
    </>
  )
}
