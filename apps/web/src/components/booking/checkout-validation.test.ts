import { describe, expect, it } from 'vitest'
import { validateSelection } from './checkout-validation.ts'

const limits = [
  { courtId: 'court-1', minSlots: 1, maxSlots: 4, slotDurationMinutes: 60 },
  { courtId: 'court-2', minSlots: 2, maxSlots: 3, slotDurationMinutes: 60 },
]

function slot(courtId: string, startsAt: string): { courtId: string; startsAt: string } {
  return { courtId, startsAt }
}

describe('validasi pilihan checkout', () => {
  it('pilihan kosong ditolak', () => {
    expect(validateSelection({ slots: [], limits, requireContiguousSlots: false })?.code).toBe(
      'EMPTY_SELECTION',
    )
  })

  it('BR-B-01: slot lintas tanggal bisnis WITA ditolak', () => {
    const result = validateSelection({
      slots: [
        slot('court-1', '2026-08-10T22:00:00+08:00'),
        slot('court-1', '2026-08-11T06:00:00+08:00'),
      ],
      limits,
      requireContiguousSlots: false,
    })

    expect(result?.code).toBe('MIXED_BOOKING_DATE')
  })

  it('BR-B-02: batas jumlah slot dihitung per court', () => {
    const tooMany = validateSelection({
      slots: [
        slot('court-1', '2026-08-10T06:00:00+08:00'),
        slot('court-1', '2026-08-10T07:00:00+08:00'),
        slot('court-1', '2026-08-10T08:00:00+08:00'),
        slot('court-1', '2026-08-10T09:00:00+08:00'),
        slot('court-1', '2026-08-10T10:00:00+08:00'),
      ],
      limits,
      requireContiguousSlots: false,
    })
    expect(tooMany?.code).toBe('SLOT_COUNT_OUT_OF_RANGE')

    const tooFew = validateSelection({
      slots: [slot('court-2', '2026-08-10T06:00:00+08:00')],
      limits,
      requireContiguousSlots: false,
    })
    expect(tooFew?.code).toBe('SLOT_COUNT_OUT_OF_RANGE')
  })

  it('BR-B-09: kontiguitas hanya diperiksa saat setting menyala', () => {
    const gapped = [
      slot('court-1', '2026-08-10T06:00:00+08:00'),
      slot('court-1', '2026-08-10T08:00:00+08:00'),
    ]

    expect(validateSelection({ slots: gapped, limits, requireContiguousSlots: false })).toBeNull()
    expect(validateSelection({ slots: gapped, limits, requireContiguousSlots: true })?.code).toBe(
      'SLOTS_NOT_CONTIGUOUS',
    )
  })

  it('BR-B-09: slot berurutan lolos meski setting menyala', () => {
    const contiguous = [
      slot('court-1', '2026-08-10T06:00:00+08:00'),
      slot('court-1', '2026-08-10T07:00:00+08:00'),
    ]

    expect(
      validateSelection({ slots: contiguous, limits, requireContiguousSlots: true }),
    ).toBeNull()
  })

  it('court tanpa batas terdaftar ditolak alih-alih diloloskan diam-diam', () => {
    const result = validateSelection({
      slots: [slot('court-9', '2026-08-10T06:00:00+08:00')],
      limits,
      requireContiguousSlots: false,
    })

    expect(result?.code).toBe('UNKNOWN_COURT')
  })
})
