import { witaDateKey } from '../../lib/format.ts'

export interface SelectedSlot {
  courtId: string
  startsAt: string
}

export interface CourtLimits {
  courtId: string
  minSlots: number
  maxSlots: number
  slotDurationMinutes: number
}

export interface CheckoutValidationError {
  code: string
  message: string
}

export interface ValidateSelectionInput {
  slots: readonly SelectedSlot[]
  limits: readonly CourtLimits[]
  requireContiguousSlots: boolean
}

/**
 * Cermin aturan peladen (BR-B-01, BR-B-02, BR-B-09) supaya customer mendapat
 * umpan balik sebelum request. Peladen tetap penentu akhir — ini bukan
 * pengganti validasinya.
 */
export function validateSelection(input: ValidateSelectionInput): CheckoutValidationError | null {
  if (input.slots.length === 0) {
    return { code: 'EMPTY_SELECTION', message: 'Pilih minimal satu slot.' }
  }

  const dates = new Set(input.slots.map((slot) => witaDateKey(slot.startsAt)))
  if (dates.size > 1) {
    return {
      code: 'MIXED_BOOKING_DATE',
      message: 'Satu booking hanya boleh berisi slot pada satu tanggal.',
    }
  }

  const byCourt = new Map<string, SelectedSlot[]>()
  for (const slot of input.slots) {
    byCourt.set(slot.courtId, [...(byCourt.get(slot.courtId) ?? []), slot])
  }

  for (const [courtId, slots] of byCourt) {
    const limit = input.limits.find((item) => item.courtId === courtId)
    if (!limit) {
      return { code: 'UNKNOWN_COURT', message: 'Lapangan tidak dikenali. Muat ulang halaman.' }
    }
    if (slots.length < limit.minSlots || slots.length > limit.maxSlots) {
      return {
        code: 'SLOT_COUNT_OUT_OF_RANGE',
        message: `Pilih ${limit.minSlots}–${limit.maxSlots} slot untuk lapangan ini.`,
      }
    }
    if (!input.requireContiguousSlots) continue

    const sorted = [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    const stepMs = limit.slotDurationMinutes * 60_000
    const isContiguous = sorted.every((current, index) => {
      if (index === 0) return true
      const previousStartsAt = sorted[index - 1]?.startsAt
      if (previousStartsAt === undefined) return true
      const gap = new Date(current.startsAt).getTime() - new Date(previousStartsAt).getTime()
      return gap === stepMs
    })
    if (!isContiguous) {
      return {
        code: 'SLOTS_NOT_CONTIGUOUS',
        message: 'Slot harus berurutan tanpa jeda.',
      }
    }
  }

  return null
}
