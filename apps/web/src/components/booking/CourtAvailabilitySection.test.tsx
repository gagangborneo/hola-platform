import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { routerPush, capturedGridProps, quotePost } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  capturedGridProps: { current: null as Record<string, unknown> | null },
  quotePost: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}))

/**
 * Alasan memock modul `api-client` (bukan `fetch` global) sama dengan
 * `AvailabilityGrid.test.tsx`: `createHolaClient` menangkap `globalThis.fetch`
 * saat modulnya dimuat, jadi `vi.stubGlobal('fetch', …)` di dalam `it()` tidak
 * pernah terlihat olehnya dan request sungguhan akan keluar ke jaringan.
 */
vi.mock('../../lib/api-client.ts', () => ({
  apiClient: { api: { v1: { bookings: { quote: { $post: quotePost } } } } },
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

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function mockQuote(totalAmount: number): void {
  quotePost.mockResolvedValue(
    Response.json({
      data: {
        lines: [],
        subtotal_amount: totalAmount,
        addon_amount: 0,
        discount_amount: 0,
        tax_amount: 0,
        fee_amount: 0,
        rounding_adjustment_amount: 0,
        total_amount: totalAmount,
        promo: null,
        warnings: [],
      },
    }),
  )
}

afterEach(() => {
  routerPush.mockReset()
  quotePost.mockReset()
  capturedGridProps.current = null
})

describe('CourtAvailabilitySection', () => {
  it('C1: memilih slot melebihi max_slots_per_booking menonaktifkan "Lanjut ke checkout" dengan alasan', async () => {
    render(<CourtAvailabilitySection {...baseProps} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: 'pilih-lima-slot' }))

    expect(await screen.findByText(/Pilih 1–4 slot/)).toBeDefined()
    const continueButton = screen.getByRole('button', { name: /Lanjut ke checkout/ })
    expect(continueButton.hasAttribute('disabled')).toBe(true)
  })

  it('pilihan valid mengaktifkan "Lanjut ke checkout" tanpa pesan error', async () => {
    render(<CourtAvailabilitySection {...baseProps} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: 'pilih-satu-slot' }))

    const continueButton = await screen.findByRole('button', { name: /Lanjut ke checkout/ })
    expect(continueButton.hasAttribute('disabled')).toBe(false)
    expect(screen.queryByText(/Pilih 1–4 slot/)).toBeNull()
  })

  it('pilihan kosong menonaktifkan tombol tanpa menampilkan pesan error (keadaan awal)', () => {
    render(<CourtAvailabilitySection {...baseProps} />, { wrapper })

    const continueButton = screen.getByRole('button', { name: /Lanjut ke checkout/ })
    expect(continueButton.hasAttribute('disabled')).toBe(true)
    expect(screen.queryByText(/Pilih minimal satu slot/)).toBeNull()
  })

  it('I2: slotConflictNotice menampilkan pesan slot baru saja diambil orang lain', () => {
    render(<CourtAvailabilitySection {...baseProps} slotConflictNotice />, { wrapper })

    expect(
      screen.getByText(/Slot yang kamu pilih sebelumnya baru saja diambil orang lain/),
    ).toBeDefined()
  })

  it('BR-B-12: total di bar sticky datang dari endpoint quote, bukan dijumlah di peramban', async () => {
    mockQuote(275_000)
    render(<CourtAvailabilitySection {...baseProps} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: 'pilih-satu-slot' }))

    expect(await screen.findByText(/Total Rp275\.000/)).toBeDefined()
    expect(quotePost).toHaveBeenCalledWith({
      json: {
        items: [{ court_id: 'court-1', starts_at: '2026-08-10T06:00:00+08:00' }],
        addons: [],
      },
    })
  })

  it('quote gagal menampilkan keadaannya, bukan angka tebakan', async () => {
    quotePost.mockRejectedValue(new Error('boom'))
    render(<CourtAvailabilitySection {...baseProps} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: 'pilih-satu-slot' }))

    expect(await screen.findByText('Harga gagal dihitung')).toBeDefined()
    expect(screen.queryByText(/Rp/)).toBeNull()
  })

  it('pilihan tidak valid tidak memanggil quote sama sekali', async () => {
    mockQuote(100_000)
    render(<CourtAvailabilitySection {...baseProps} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: 'pilih-lima-slot' }))

    expect(await screen.findByText(/Pilih 1–4 slot/)).toBeDefined()
    expect(quotePost).not.toHaveBeenCalled()
  })

  it('I2: initialDate diteruskan ke AvailabilityGrid supaya tanggal konflik terpilih otomatis', () => {
    render(<CourtAvailabilitySection {...baseProps} initialDate="2026-08-10" />, { wrapper })

    expect(capturedGridProps.current?.initialDate).toBe('2026-08-10')
  })
})
