import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { bookingGet } = vi.hoisted(() => ({ bookingGet: vi.fn() }))

// `apiClient` dimock, bukan `fetch` global — lihat AvailabilityGrid.test.tsx
// untuk alasan lengkap (createHolaClient menangkap `globalThis.fetch` sekali
// saat modul dimuat, sebelum body test manapun berjalan).
vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: {
      v1: {
        bookings: {
          ':id': {
            $get: bookingGet,
            cancel: { $post: vi.fn() },
          },
        },
      },
    },
  },
}))

import { BookingDetail } from './BookingDetail.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const baseBooking = {
  id: 'booking-1',
  booking_code: 'HOLA-0001',
  status: 'confirmed',
  booking_date: '2026-08-10',
  hold_expires_at: null,
  total_amount: 300000,
  is_cancellable: true,
  refund_estimate_amount: 150000,
  policy_applied: 'option_b_50_percent',
  items: [
    {
      id: 'item-1',
      starts_at: '2026-08-10T06:00:00+08:00',
      ends_at: '2026-08-10T07:00:00+08:00',
      rate_class: 'offpeak',
      line_total_amount: 150000,
    },
  ],
}

afterEach(() => {
  bookingGet.mockReset()
})

describe('BookingDetail', () => {
  it('menampilkan detail booking dan tombol pembatalan saat is_cancellable true', async () => {
    bookingGet.mockResolvedValue(Response.json({ data: baseBooking }))

    render(<BookingDetail bookingId="booking-1" cancellationPolicyText={null} />, { wrapper })

    expect(await screen.findByText('HOLA-0001')).toBeDefined()
    // I1: status booking dan rate_class harus tampil dalam Bahasa Indonesia,
    // konsisten dengan label yang sama di BookingList (bukan enum mentah).
    expect(screen.getByText('Terkonfirmasi')).toBeDefined()
    expect(screen.queryByText('confirmed')).toBeNull()
    expect(screen.getByText(/Jam biasa/)).toBeDefined()
    expect(screen.getByText('Rp300.000')).toBeDefined()
    expect(screen.getByRole('button', { name: /Batalkan booking/ })).toBeDefined()
  })

  it('tidak menampilkan tombol pembatalan saat is_cancellable false', async () => {
    bookingGet.mockResolvedValue(Response.json({ data: { ...baseBooking, is_cancellable: false } }))

    render(<BookingDetail bookingId="booking-1" cancellationPolicyText={null} />, { wrapper })

    await screen.findByText('HOLA-0001')
    expect(screen.queryByRole('button', { name: /Batalkan booking/ })).toBeNull()
  })

  it('menampilkan pesan error saat booking gagal dimuat', async () => {
    bookingGet.mockRejectedValue(new Error('Booking tidak ditemukan.'))

    render(<BookingDetail bookingId="booking-1" cancellationPolicyText={null} />, { wrapper })

    expect(await screen.findByText('Booking tidak ditemukan.')).toBeDefined()
  })
})
