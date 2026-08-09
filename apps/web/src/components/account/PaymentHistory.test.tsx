import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { bookingsGet } = vi.hoisted(() => ({ bookingsGet: vi.fn() }))

vi.mock('../../lib/api-client.ts', () => ({
  apiClient: { api: { v1: { me: { bookings: { $get: bookingsGet } } } } },
}))

import { PaymentHistory } from './PaymentHistory.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const unpaid = {
  id: 'booking-1',
  booking_code: 'HOLA-2608-0001',
  status: 'pending_payment',
  booking_date: '2026-08-20',
  slot_count: 2,
  total_amount: 180_000,
  hold_expires_at: '2026-08-09T07:15:00.000Z',
  checked_in_at: null,
  created_at: '2026-08-09T06:00:00.000Z',
}

const paid = {
  ...unpaid,
  id: 'booking-2',
  booking_code: 'HOLA-2608-0002',
  status: 'confirmed',
  hold_expires_at: null,
}

const cancelled = {
  ...paid,
  id: 'booking-3',
  booking_code: 'HOLA-2608-0003',
  status: 'cancelled',
}

/** Body `Response` hanya bisa dibaca sekali; tiap panggilan dapat instans baru. */
function servePage(rows: unknown[]): () => Promise<Response> {
  return () =>
    Promise.resolve(
      Response.json({
        data: rows,
        meta: { pagination: { mode: 'cursor', limit: 20, next_cursor: null, has_more: false } },
      }),
    )
}

afterEach(() => {
  bookingsGet.mockReset()
})

describe('PaymentHistory', () => {
  it('mengambil seluruh transaksi lewat /me/bookings, bukan /payments yang tertutup untuk customer', async () => {
    bookingsGet.mockImplementation(servePage([unpaid]))

    render(<PaymentHistory />, { wrapper })

    await waitFor(() => {
      expect(bookingsGet).toHaveBeenCalledWith({ query: { upcoming: 'false' } })
    })
  })

  it('menyaring ke tagihan tertunggak lewat API, bukan memotong hasil di klien', async () => {
    bookingsGet.mockImplementation(servePage([unpaid, paid]))

    render(<PaymentHistory />, { wrapper })

    fireEvent.click(await screen.findByRole('tab', { name: 'Belum dibayar' }))

    await waitFor(() => {
      expect(bookingsGet).toHaveBeenCalledWith({
        query: { upcoming: 'false', status: 'pending_payment' },
      })
    })
  })

  it('menonjolkan tenggat dan tombol bayar hanya untuk tagihan yang belum dibayar', async () => {
    bookingsGet.mockImplementation(servePage([unpaid, paid]))

    render(<PaymentHistory />, { wrapper })

    const pay = await screen.findAllByRole('link', { name: 'Bayar sekarang' })
    expect(pay).toHaveLength(1)
    expect(pay[0]?.getAttribute('href')).toBe('/booking/booking-1')
    expect(screen.getByText(/Bayar sebelum/)).toBeDefined()
  })

  it('menautkan e-receipt hanya untuk booking yang tiketnya sudah berlaku', async () => {
    bookingsGet.mockImplementation(servePage([unpaid, paid, cancelled]))

    render(<PaymentHistory />, { wrapper })

    const receipts = await screen.findAllByRole('link', { name: 'E-receipt' })
    expect(receipts).toHaveLength(1)
    expect(receipts[0]?.getAttribute('href')).toBe('/akun/booking/booking-2/receipt')
  })

  it('menampilkan status booking apa adanya, bukan enum mentah (I1)', async () => {
    bookingsGet.mockImplementation(servePage([unpaid, cancelled]))

    render(<PaymentHistory />, { wrapper })

    expect(await screen.findByText('Menunggu pembayaran')).toBeDefined()
    expect(screen.getByText('Dibatalkan')).toBeDefined()
    expect(screen.queryByText('pending_payment')).toBeNull()
  })

  it('menampilkan keadaan kosong, bukan daftar hampa', async () => {
    bookingsGet.mockImplementation(servePage([]))

    render(<PaymentHistory />, { wrapper })

    expect(await screen.findByText('Belum ada transaksi')).toBeDefined()
  })

  it('menawarkan coba lagi saat daftarnya gagal dimuat', async () => {
    bookingsGet.mockRejectedValue(new Error('offline'))

    render(<PaymentHistory />, { wrapper })

    expect(await screen.findByText('Riwayat pembayaran gagal dimuat.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeDefined()
  })
})
