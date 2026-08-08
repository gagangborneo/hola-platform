import { HolaApiError } from '@hola/api-client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { quotePost, bookingsPost, routerPush } = vi.hoisted(() => ({
  quotePost: vi.fn(),
  bookingsPost: vi.fn(),
  routerPush: vi.fn(),
}))

// `apiClient` dimock, bukan `fetch` global — lihat AvailabilityGrid.test.tsx untuk
// alasan lengkap (createHolaClient menangkap `globalThis.fetch` sekali saat modul
// dimuat, sebelum body test manapun berjalan).
vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: { v1: { bookings: { quote: { $post: quotePost }, $post: bookingsPost } } },
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}))

import { CheckoutForm } from './CheckoutForm.tsx'

const limits = [{ courtId: 'court-1', minSlots: 1, maxSlots: 1, slotDurationMinutes: 60 }]

function quoteWith(overrides: {
  total_amount: number
  warnings: { code: string; message: string }[]
}): Response {
  return Response.json({
    data: {
      kind: 'booking',
      lines: [],
      subtotal_amount: overrides.total_amount,
      addon_amount: 0,
      tier_discount_amount: 0,
      promo: null,
      discount_amount: 0,
      taxable_base_amount: overrides.total_amount,
      tax_rate: 0,
      tax_amount: 0,
      fee_amount: 0,
      rounding_adjustment_amount: 0,
      total_amount: overrides.total_amount,
      currency: 'IDR',
      warnings: overrides.warnings,
    },
  })
}

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  quotePost.mockReset()
  bookingsPost.mockReset()
  routerPush.mockReset()
})

describe('CheckoutForm', () => {
  it('C1: jumlah slot di luar batas court menonaktifkan bayar dan menyediakan jalan kembali', async () => {
    render(
      <CheckoutForm
        courtId="court-1"
        courtCode="PDL-01"
        startsAtList={['2026-08-10T06:00:00+08:00', '2026-08-10T07:00:00+08:00']}
        limits={limits}
        requireContiguousSlots={false}
        cancellationPolicyText={null}
      />,
      { wrapper },
    )

    // Tanpa perbaikan C1, layar ini tidak akan pernah tercapai lewat UI yang benar
    // (tombol "Lanjut ke checkout" sudah menahannya di CourtAvailabilitySection) —
    // tapi `/checkout` bisa diakses langsung lewat URL apa pun, jadi harus tetap
    // aman berdiri sendiri.
    expect(await screen.findByText(/Pilih 1–1 slot/)).toBeDefined()
    expect(quotePost).not.toHaveBeenCalled()

    const backLink = screen.getByRole('link', { name: /Kembali pilih slot/ })
    expect(backLink.getAttribute('href')).toBe('/lapangan/PDL-01')

    const payButton = screen.getByRole('button', { name: /Kunci slot & bayar/ })
    expect(payButton.hasAttribute('disabled')).toBe(true)
  })

  it('I2: SLOT_ALREADY_CLAIMED mengirim kembali ke /lapangan/{code} dengan tanggal yang sama, bukan ke daftar lapangan', async () => {
    quotePost.mockResolvedValue(quoteWith({ total_amount: 150000, warnings: [] }))
    bookingsPost.mockRejectedValue(
      new HolaApiError({
        status: 409,
        code: 'SLOT_ALREADY_CLAIMED',
        message: 'Slot sudah diambil.',
        details: undefined,
        requestId: undefined,
      }),
    )

    render(
      <CheckoutForm
        courtId="court-1"
        courtCode="PDL-01"
        startsAtList={['2026-08-10T06:00:00+08:00']}
        limits={limits}
        requireContiguousSlots={false}
        cancellationPolicyText={null}
      />,
      { wrapper },
    )

    const payButton = await screen.findByRole('button', { name: /Kunci slot & bayar/ })
    await waitFor(() => expect(payButton.hasAttribute('disabled')).toBe(false))
    await userEvent.click(payButton)

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith('/lapangan/PDL-01?diambil=1&tanggal=2026-08-10')
    })
  })

  it('I6: PRICE_CHANGED mengunci tombol bayar sampai customer menyetujui total baru secara eksplisit', async () => {
    quotePost.mockResolvedValue(
      quoteWith({
        total_amount: 175000,
        warnings: [{ code: 'PRICE_CHANGED', message: 'Harga berubah.' }],
      }),
    )

    render(
      <CheckoutForm
        courtId="court-1"
        courtCode="PDL-01"
        startsAtList={['2026-08-10T06:00:00+08:00']}
        limits={limits}
        requireContiguousSlots={false}
        cancellationPolicyText={null}
      />,
      { wrapper },
    )

    expect(await screen.findByText(/Total yang akan ditagihkan sekarang/)).toBeDefined()
    expect(screen.getAllByText('Rp175.000').length).toBeGreaterThan(0)

    const payButton = screen.getByRole('button', { name: /Kunci slot & bayar/ })
    expect(payButton.hasAttribute('disabled')).toBe(true)

    await userEvent.click(screen.getByRole('checkbox'))
    expect(payButton.hasAttribute('disabled')).toBe(false)
  })

  it('I6: tanpa peringatan harga, tombol bayar aktif begitu quote siap (tidak ada gating tambahan)', async () => {
    quotePost.mockResolvedValue(quoteWith({ total_amount: 150000, warnings: [] }))

    render(
      <CheckoutForm
        courtId="court-1"
        courtCode="PDL-01"
        startsAtList={['2026-08-10T06:00:00+08:00']}
        limits={limits}
        requireContiguousSlots={false}
        cancellationPolicyText={null}
      />,
      { wrapper },
    )

    await screen.findAllByText('Rp150.000')
    expect(screen.queryByRole('checkbox')).toBeNull()

    const payButton = screen.getByRole('button', { name: /Kunci slot & bayar/ })
    expect(payButton.hasAttribute('disabled')).toBe(false)
  })
})
