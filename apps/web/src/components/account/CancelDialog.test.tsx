import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { bookingsCancelPost } = vi.hoisted(() => ({ bookingsCancelPost: vi.fn() }))

// `apiClient` dimock, bukan `fetch` global — lihat AvailabilityGrid.test.tsx
// untuk alasan lengkap (createHolaClient menangkap `globalThis.fetch` sekali
// saat modul dimuat, sebelum body test manapun berjalan).
vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: { v1: { bookings: { ':id': { cancel: { $post: bookingsCancelPost } } } } },
  },
}))

import { CancelDialog } from './CancelDialog.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

async function openDialog(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /Batalkan booking/ }))
}

afterEach(() => {
  bookingsCancelPost.mockReset()
})

describe('CancelDialog', () => {
  it('BR-B-71: menampilkan nominal pengembalian, label kebijakan, dan teks kebijakan sebelum tombol konfirmasi bisa ditekan', async () => {
    render(
      <CancelDialog
        bookingId="booking-1"
        refundEstimateAmount={150000}
        policyApplied="option_b_50_percent"
        cancellationPolicyText="Pembatalan mengikuti kebijakan aktif."
        onCancelled={vi.fn()}
      />,
      { wrapper },
    )

    await openDialog()

    // Ketiga informasi ini harus sudah terlihat begitu dialog terbuka —
    // sebelum alasan diisi, sebelum tombol konfirmasi bisa ditekan.
    expect(screen.getByText('Rp150.000')).toBeDefined()
    expect(screen.getByText('Pengembalian 50%')).toBeDefined()
    expect(screen.getByText('Pembatalan mengikuti kebijakan aktif.')).toBeDefined()

    const confirmButton = screen.getByRole('button', { name: /Ya, batalkan booking/ })
    expect(confirmButton.hasAttribute('disabled')).toBe(true)
  })

  it('BR-B-71: saat cancellationPolicyText null (K-08 belum dikirim), menampilkan pernyataan pengganti yang jujur alih-alih slot kosong', async () => {
    render(
      <CancelDialog
        bookingId="booking-1"
        refundEstimateAmount={150000}
        policyApplied="option_b_50_percent"
        cancellationPolicyText={null}
        onCancelled={vi.fn()}
      />,
      { wrapper },
    )

    await openDialog()

    // Ketiga slot BR-B-71 tetap terisi walau teks kebijakan venue belum ada:
    // nominal, label kebijakan, dan — di sini — pernyataan pengganti yang
    // jujur (bukan kosong, bukan kebijakan yang dikarang).
    expect(screen.getByText('Rp150.000')).toBeDefined()
    expect(screen.getByText('Pengembalian 50%')).toBeDefined()
    expect(
      screen.getByText(
        'Venue belum mempublikasikan teks kebijakan pembatalan secara rinci. ' +
          'Nominal perkiraan pengembalian di atas tetap yang berlaku untuk pembatalan ini.',
      ),
    ).toBeDefined()

    const confirmButton = screen.getByRole('button', { name: /Ya, batalkan booking/ })
    expect(confirmButton.hasAttribute('disabled')).toBe(true)
  })

  it('BR-B-63: refund Rp0 tetap ditampilkan, tidak disembunyikan', async () => {
    render(
      <CancelDialog
        bookingId="booking-1"
        refundEstimateAmount={0}
        policyApplied="option_b_no_refund_under_24h"
        cancellationPolicyText="Kurang dari 24 jam sebelum main, tidak ada pengembalian."
        onCancelled={vi.fn()}
      />,
      { wrapper },
    )

    await openDialog()

    expect(screen.getByText('Rp0')).toBeDefined()
    expect(screen.getByText('Kurang dari 24 jam sebelum main — tanpa pengembalian')).toBeDefined()
  })

  it('tombol konfirmasi tetap terkunci sampai alasan diisi', async () => {
    render(
      <CancelDialog
        bookingId="booking-1"
        refundEstimateAmount={150000}
        policyApplied="option_b_50_percent"
        cancellationPolicyText={null}
        onCancelled={vi.fn()}
      />,
      { wrapper },
    )

    await openDialog()

    // Teks kebijakan null tidak berarti slot ketiga kosong — pernyataan
    // pengganti harus tetap terlihat di sini juga, bukan hanya di test
    // BR-B-71 khusus di atas.
    expect(
      screen.getByText(
        'Venue belum mempublikasikan teks kebijakan pembatalan secara rinci. ' +
          'Nominal perkiraan pengembalian di atas tetap yang berlaku untuk pembatalan ini.',
      ),
    ).toBeDefined()

    const confirmButton = screen.getByRole('button', { name: /Ya, batalkan booking/ })
    expect(confirmButton.hasAttribute('disabled')).toBe(true)

    await userEvent.type(screen.getByLabelText('Alasan pembatalan'), 'Ganti rencana')
    expect(confirmButton.hasAttribute('disabled')).toBe(false)

    await userEvent.clear(screen.getByLabelText('Alasan pembatalan'))
    expect(confirmButton.hasAttribute('disabled')).toBe(true)
  })

  it('mengirim { reason } dan memicu onCancelled saat sukses', async () => {
    bookingsCancelPost.mockResolvedValue(
      Response.json({
        data: { id: 'booking-1', status: 'cancelled', refund_estimate_amount: 150000 },
      }),
    )
    const onCancelled = vi.fn()

    render(
      <CancelDialog
        bookingId="booking-1"
        refundEstimateAmount={150000}
        policyApplied="option_b_50_percent"
        cancellationPolicyText={null}
        onCancelled={onCancelled}
      />,
      { wrapper },
    )

    await openDialog()
    await userEvent.type(screen.getByLabelText('Alasan pembatalan'), 'Ganti rencana')
    await userEvent.click(screen.getByRole('button', { name: /Ya, batalkan booking/ }))

    await waitFor(() => expect(onCancelled).toHaveBeenCalledTimes(1))
    expect(bookingsCancelPost).toHaveBeenCalledWith({
      param: { id: 'booking-1' },
      json: { reason: 'Ganti rencana' },
    })
  })

  it('menampilkan pesan error dari HolaApiError alih-alih diam saat pembatalan gagal', async () => {
    bookingsCancelPost.mockRejectedValue(new Error('Booking sudah dibatalkan sebelumnya.'))

    render(
      <CancelDialog
        bookingId="booking-1"
        refundEstimateAmount={150000}
        policyApplied="option_b_50_percent"
        cancellationPolicyText={null}
        onCancelled={vi.fn()}
      />,
      { wrapper },
    )

    await openDialog()
    await userEvent.type(screen.getByLabelText('Alasan pembatalan'), 'Ganti rencana')
    await userEvent.click(screen.getByRole('button', { name: /Ya, batalkan booking/ }))

    expect(await screen.findByText('Booking sudah dibatalkan sebelumnya.')).toBeDefined()
  })
})
