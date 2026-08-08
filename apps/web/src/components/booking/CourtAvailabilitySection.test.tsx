import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { routerPush, capturedGridProps } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  capturedGridProps: { current: null as Record<string, unknown> | null },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}))

/**
 * `AvailabilityGrid` dimock supaya test ini bisa mengontrol langsung
 * `onSelectionChange` (isi grid sungguhan datang dari API, sudah dites
 * terpisah di AvailabilityGrid.test.tsx) — di sini yang diuji murni logika
 * gating `CourtAvailabilitySection` (C1) dan penerusan prop `initialDate`
 * /`slotConflictNotice` (I2).
 */
vi.mock('./AvailabilityGrid.tsx', () => ({
  AvailabilityGrid: (props: {
    onSelectionChange: (slots: { starts_at: string }[]) => void
    initialDate?: string
  }) => {
    capturedGridProps.current = props
    const fiveSlots = Array.from({ length: 5 }, (_, index) => ({
      starts_at: `2026-08-10T0${index}:00:00+08:00`,
    }))
    const oneSlot = [{ starts_at: '2026-08-10T06:00:00+08:00' }]
    return (
      <div>
        <button type="button" onClick={() => props.onSelectionChange(fiveSlots)}>
          pilih-lima-slot
        </button>
        <button type="button" onClick={() => props.onSelectionChange(oneSlot)}>
          pilih-satu-slot
        </button>
      </div>
    )
  },
}))

import { CourtAvailabilitySection } from './CourtAvailabilitySection.tsx'

const baseProps = {
  courtId: 'court-1',
  horizonDays: 14,
  serverTime: '2026-08-08T10:00:00+08:00',
  minSlotsPerBooking: 1,
  maxSlotsPerBooking: 4,
  slotDurationMinutes: 60,
  requireContiguousSlots: false,
}

afterEach(() => {
  routerPush.mockReset()
  capturedGridProps.current = null
})

describe('CourtAvailabilitySection', () => {
  it('C1: memilih slot melebihi max_slots_per_booking menonaktifkan "Lanjut ke checkout" dengan alasan', async () => {
    render(<CourtAvailabilitySection {...baseProps} />)

    await userEvent.click(screen.getByRole('button', { name: 'pilih-lima-slot' }))

    expect(await screen.findByText(/Pilih 1–4 slot/)).toBeDefined()
    const continueButton = screen.getByRole('button', { name: /Lanjut ke checkout/ })
    expect(continueButton.hasAttribute('disabled')).toBe(true)
  })

  it('pilihan valid mengaktifkan "Lanjut ke checkout" tanpa pesan error', async () => {
    render(<CourtAvailabilitySection {...baseProps} />)

    await userEvent.click(screen.getByRole('button', { name: 'pilih-satu-slot' }))

    const continueButton = await screen.findByRole('button', { name: /Lanjut ke checkout/ })
    expect(continueButton.hasAttribute('disabled')).toBe(false)
    expect(screen.queryByText(/Pilih 1–4 slot/)).toBeNull()
  })

  it('pilihan kosong menonaktifkan tombol tanpa menampilkan pesan error (keadaan awal)', () => {
    render(<CourtAvailabilitySection {...baseProps} />)

    const continueButton = screen.getByRole('button', { name: /Lanjut ke checkout/ })
    expect(continueButton.hasAttribute('disabled')).toBe(true)
    expect(screen.queryByText(/Pilih minimal satu slot/)).toBeNull()
  })

  it('I2: slotConflictNotice menampilkan pesan slot baru saja diambil orang lain', () => {
    render(<CourtAvailabilitySection {...baseProps} slotConflictNotice />)

    expect(
      screen.getByText(/Slot yang kamu pilih sebelumnya baru saja diambil orang lain/),
    ).toBeDefined()
  })

  it('I2: initialDate diteruskan ke AvailabilityGrid supaya tanggal konflik terpilih otomatis', () => {
    render(<CourtAvailabilitySection {...baseProps} initialDate="2026-08-10" />)

    expect(capturedGridProps.current?.initialDate).toBe('2026-08-10')
  })
})
