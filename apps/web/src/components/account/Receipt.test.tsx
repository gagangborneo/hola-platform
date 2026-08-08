import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { receiptGet } = vi.hoisted(() => ({ receiptGet: vi.fn() }))

// `apiClient` dimock, bukan `fetch` global — lihat AvailabilityGrid.test.tsx
// untuk alasan lengkap (createHolaClient menangkap `globalThis.fetch` sekali
// saat modul dimuat, sebelum body test manapun berjalan).
vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: { v1: { bookings: { ':id': { receipt: { $get: receiptGet } } } } },
  },
}))

import { Receipt } from './Receipt.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  receiptGet.mockReset()
})

describe('Receipt', () => {
  it('menampilkan kode booking, item, dan total dari bentuk respons receipt yang sebenarnya', async () => {
    receiptGet.mockResolvedValue(
      Response.json({
        data: {
          booking_code: 'HOLA-0001',
          booking_date: '2026-08-10',
          status: 'confirmed',
          quote: { subtotal_amount: 150000, discount_amount: 0, total_amount: 150000 },
          total_amount: 150000,
          items: [
            {
              id: 'item-1',
              starts_at: '2026-08-10T06:00:00+08:00',
              ends_at: '2026-08-10T07:00:00+08:00',
              rate_class: 'offpeak',
              line_total_amount: 150000,
            },
          ],
        },
      }),
    )

    render(<Receipt bookingId="booking-1" />, { wrapper })

    expect(await screen.findByText('HOLA-0001')).toBeDefined()
    expect(screen.getByText('confirmed')).toBeDefined()
    expect(screen.getAllByText('Rp150.000')).toHaveLength(2)
  })

  it('menampilkan pesan error saat e-receipt gagal dimuat', async () => {
    receiptGet.mockRejectedValue(new Error('E-receipt tidak dapat dimuat.'))

    render(<Receipt bookingId="booking-1" />, { wrapper })

    expect(await screen.findByText('E-receipt belum tersedia.')).toBeDefined()
  })
})
