import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { paymentsGet, syncPost } = vi.hoisted(() => ({
  paymentsGet: vi.fn(),
  syncPost: vi.fn(),
}))

/**
 * `sync.$post` dimock di sini juga (walau tidak pernah dipanggil kode
 * produksi) semata supaya test bisa MEMBUKTIKAN itu — kalau `PaymentStatus`
 * pernah memanggilnya, assertion `syncPost` di bawah akan gagal. Endpoint itu
 * `requireRole([STAFF, ADMIN])`; customer yang memanggilnya dapat 403.
 */
vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: {
      v1: {
        payments: {
          ':id': {
            $get: paymentsGet,
            sync: { $post: syncPost },
          },
        },
      },
    },
  },
}))

import { PaymentStatus } from './PaymentStatus.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function mockStatus(status: string): void {
  paymentsGet.mockResolvedValue(Response.json({ data: { id: 'payment-1', status } }))
}

afterEach(() => {
  paymentsGet.mockReset()
  syncPost.mockReset()
  vi.useRealTimers()
})

describe('PaymentStatus', () => {
  it('status "paid" menampilkan konfirmasi dan berhenti polling', async () => {
    mockStatus('paid')
    render(<PaymentStatus paymentId="payment-1" bookingId="booking-1" />, { wrapper })

    expect(await screen.findByText('Pembayaran berhasil')).toBeDefined()
    const callsAfterFirstRender = paymentsGet.mock.calls.length

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(paymentsGet.mock.calls.length).toBe(callsAfterFirstRender)
  })

  it('tidak pernah memanggil POST /payments/{id}/sync — endpoint itu 403 untuk customer', async () => {
    mockStatus('pending')
    render(<PaymentStatus paymentId="payment-1" bookingId="booking-1" />, { wrapper })

    await waitFor(() => expect(paymentsGet).toHaveBeenCalled())
    expect(syncPost).not.toHaveBeenCalled()
  })

  it('berhenti polling setelah 5 menit dan menawarkan periksa ulang manual', async () => {
    vi.useFakeTimers()
    mockStatus('pending')
    render(<PaymentStatus paymentId="payment-1" bookingId="booking-1" />, { wrapper })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000 + 1_000)
    })

    expect(screen.getByText('Belum ada konfirmasi')).toBeDefined()
    const callsAtCutoff = paymentsGet.mock.calls.length

    // Bukti bahwa polling GENUINELY berhenti, bukan sekadar UI yang
    // menyembunyikan status "sedang menunggu" — jumlah panggilan tidak naik
    // lagi walau waktu terus berjalan.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(paymentsGet.mock.calls.length).toBe(callsAtCutoff)
  })

  it('"Periksa lagi" memanggil ulang GET /payments/{id} secara manual, bukan sync', async () => {
    vi.useFakeTimers()
    mockStatus('pending')
    render(<PaymentStatus paymentId="payment-1" bookingId="booking-1" />, { wrapper })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000 + 1_000)
    })
    screen.getByText('Belum ada konfirmasi')
    const callsBeforeClick = paymentsGet.mock.calls.length
    vi.useRealTimers()

    await userEvent.click(screen.getByRole('button', { name: 'Periksa lagi' }))

    await waitFor(() => expect(paymentsGet.mock.calls.length).toBeGreaterThan(callsBeforeClick))
    expect(syncPost).not.toHaveBeenCalled()
  })
})
