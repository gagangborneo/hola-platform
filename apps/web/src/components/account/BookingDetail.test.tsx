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

vi.mock('../../lib/auth.ts', () => ({
  useAuthSession: () => ({
    accessToken: 'token',
    isReady: true,
    user: {
      id: 'user-1',
      role: 'customer',
      email: 'pemain@hola.test',
      phone: null,
      fullName: 'Rangga Bayu',
    },
  }),
}))

import { BookingDetail } from './BookingDetail.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const COURTS = {
  'court-1': { name: 'Padel Court 3', code: 'PDL-03' },
}

const baseBooking = {
  id: 'booking-1',
  booking_code: 'HOLA-0001',
  status: 'confirmed',
  channel: 'web',
  booking_date: '2026-08-10',
  slot_count: 1,
  hold_expires_at: null,
  checked_in_at: null,
  guest_name: null,
  guest_phone: null,
  customer_note: null,
  created_at: '2026-08-01T02:00:00+08:00',
  total_amount: 300000,
  is_cancellable: true,
  refund_estimate_amount: 150000,
  policy_applied: 'option_b_50_percent',
  quote: { subtotal_amount: 300000, discount_amount: 0, fee_amount: 0, tax_amount: 0 },
  items: [
    {
      id: 'item-1',
      court_id: 'court-1',
      starts_at: '2026-08-10T06:00:00+08:00',
      ends_at: '2026-08-10T07:00:00+08:00',
      rate_class: 'offpeak',
      line_total_amount: 150000,
    },
  ],
}

function renderDetail(): void {
  render(<BookingDetail bookingId="booking-1" cancellationPolicyText={null} courts={COURTS} />, {
    wrapper,
  })
}

afterEach(() => {
  bookingGet.mockReset()
})

describe('BookingDetail', () => {
  it('menampilkan detail booking dan tombol pembatalan saat is_cancellable true', async () => {
    bookingGet.mockResolvedValue(Response.json({ data: baseBooking }))

    renderDetail()

    expect(await screen.findByText('HOLA-0001')).toBeDefined()
    // I1: status booking dan rate_class harus tampil dalam Bahasa Indonesia,
    // konsisten dengan label yang sama di BookingList (bukan enum mentah).
    expect(screen.getByText('Terkonfirmasi')).toBeDefined()
    expect(screen.queryByText('confirmed')).toBeNull()
    expect(screen.getByText(/Jam biasa/)).toBeDefined()
    // Total muncul di subtotal dan baris total — keduanya nominal dari API.
    expect(screen.getAllByText('Rp300.000').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Batalkan booking/ })).toBeDefined()
  })

  it('menerangkan siapa pemesan, lapangan mana, dan jam berapa', async () => {
    bookingGet.mockResolvedValue(Response.json({ data: baseBooking }))

    renderDetail()

    await screen.findByText('HOLA-0001')
    // Nama pemesan booking sendiri datang dari sesi; baris booking tidak memuatnya.
    expect(screen.getByText('Rangga Bayu')).toBeDefined()
    expect(screen.getByText('Padel Court 3 (PDL-03)')).toBeDefined()
    // Muncul di ringkasan e-tiket dan di rincian jadwal per slot.
    expect(screen.getAllByText('06.00–07.00 WITA').length).toBeGreaterThan(0)
  })

  it('membedakan tiket yang belum dan sudah digunakan', async () => {
    bookingGet.mockResolvedValue(Response.json({ data: baseBooking }))
    const { unmount } = render(
      <BookingDetail bookingId="booking-1" cancellationPolicyText={null} courts={COURTS} />,
      { wrapper },
    )
    expect(await screen.findByText('Belum digunakan')).toBeDefined()
    unmount()

    bookingGet.mockResolvedValue(
      Response.json({ data: { ...baseBooking, checked_in_at: '2026-08-10T06:05:00+08:00' } }),
    )
    renderDetail()

    expect(await screen.findByText('Sudah digunakan')).toBeDefined()
    expect(screen.getByText(/Check-in tercatat/)).toBeDefined()
  })

  it('menawarkan unduh invoice hanya untuk booking yang sudah sah dipakai', async () => {
    bookingGet.mockResolvedValue(Response.json({ data: baseBooking }))
    const { unmount } = render(
      <BookingDetail bookingId="booking-1" cancellationPolicyText={null} courts={COURTS} />,
      { wrapper },
    )
    expect((await screen.findByRole('link', { name: /Unduh invoice/ })).getAttribute('href')).toBe(
      '/akun/booking/booking-1/receipt?print=1',
    )
    unmount()

    bookingGet.mockResolvedValue(
      Response.json({
        data: {
          ...baseBooking,
          status: 'pending_payment',
          hold_expires_at: '2026-08-01T03:00:00+08:00',
        },
      }),
    )
    renderDetail()

    await screen.findByText('HOLA-0001')
    expect(screen.queryByRole('link', { name: /Unduh invoice/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Lanjutkan pembayaran/ })).toBeDefined()
  })

  it('tidak menampilkan tombol pembatalan saat is_cancellable false', async () => {
    bookingGet.mockResolvedValue(Response.json({ data: { ...baseBooking, is_cancellable: false } }))

    renderDetail()

    await screen.findByText('HOLA-0001')
    expect(screen.queryByRole('button', { name: /Batalkan booking/ })).toBeNull()
  })

  it('menampilkan pesan error saat booking gagal dimuat', async () => {
    bookingGet.mockRejectedValue(new Error('Booking tidak ditemukan.'))

    renderDetail()

    expect(await screen.findByText('Booking tidak ditemukan.')).toBeDefined()
  })
})
