import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { paymentsPost, routerPush } = vi.hoisted(() => ({
  paymentsPost: vi.fn(),
  routerPush: vi.fn(),
}))

/**
 * `apiClient` dimock, bukan `fetch` global — lihat AvailabilityGrid.test.tsx
 * untuk alasan lengkap (createHolaClient menangkap `globalThis.fetch` sekali
 * saat modul dimuat, sebelum body test manapun berjalan).
 */
vi.mock('../../lib/api-client.ts', () => ({
  apiClient: { api: { v1: { payments: { $post: paymentsPost } } } },
}))

// `PayButton` membaca `env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` di top-level
// modul (untuk memilih origin Snap) — itu jalan begitu modul diimpor, jauh
// sebelum body test manapun berjalan, dan `env.ts` asli melempar `ZodError`
// tanpa `.env` di-source saat `vitest run` dipanggil (lihat task-12-report).
vi.mock('../../lib/env.ts', () => ({
  env: { NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION: 'false' },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}))

// `next/script` dimock supaya test bisa memicu `onError`-nya secara manual —
// happy-dom tidak benar-benar mengambil resource `<script src>` eksternal,
// jadi event `load`/`error` nyata tidak akan pernah terpicu tanpa ini.
const { scriptProps } = vi.hoisted(() => ({
  scriptProps: { current: null as { onError?: () => void } | null },
}))
vi.mock('next/script', () => ({
  default: (props: { onError?: () => void }) => {
    scriptProps.current = props
    return null
  },
}))

import { PayButton } from './PayButton.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  paymentsPost.mockReset()
  routerPush.mockReset()
  scriptProps.current = null
  Reflect.deleteProperty(globalThis, 'snap')
})

describe('PayButton', () => {
  it('memanggil snap.pay dan pindah ke halaman status saat sukses', async () => {
    paymentsPost.mockResolvedValue(
      Response.json(
        { data: { id: 'payment-1', snap_token: 'token-abc', snap_redirect_url: null } },
        { status: 201 },
      ),
    )
    const pay = vi.fn((_token: string, callbacks: { onSuccess: () => void }) =>
      callbacks.onSuccess(),
    )
    ;(globalThis as { snap?: unknown }).snap = { pay }

    render(<PayButton bookingId="booking-1" midtransClientKey="client-key" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /Bayar sekarang/ }))

    await waitFor(() => {
      expect(pay).toHaveBeenCalledWith('token-abc', expect.anything())
    })
    expect(routerPush).toHaveBeenCalledWith('/booking/booking-1/status?payment=payment-1')
  })

  it('mengirim body { booking_id } saja dengan Idempotency-Key', async () => {
    paymentsPost.mockResolvedValue(
      Response.json(
        { data: { id: 'payment-1', snap_token: 'token-abc', snap_redirect_url: null } },
        { status: 201 },
      ),
    )
    ;(globalThis as { snap?: unknown }).snap = { pay: vi.fn() }

    render(<PayButton bookingId="booking-1" midtransClientKey="client-key" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /Bayar sekarang/ }))

    await waitFor(() => expect(paymentsPost).toHaveBeenCalledTimes(1))
    const [body, init] = paymentsPost.mock.calls[0] as [
      { json: unknown },
      { headers: Record<string, string> },
    ]
    expect(body).toEqual({ json: { booking_id: 'booking-1' } })
    expect(init.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('E-? script snap.js gagal dimuat: fallback navigasi penuh ke snap_redirect_url', async () => {
    paymentsPost.mockResolvedValue(
      Response.json(
        {
          data: {
            id: 'payment-1',
            snap_token: 'token-abc',
            snap_redirect_url: 'https://app.sandbox.midtrans.com/snap/v3/redirection/token-abc',
          },
        },
        { status: 201 },
      ),
    )
    const pay = vi.fn()
    ;(globalThis as { snap?: unknown }).snap = { pay }

    const originalLocation = globalThis.location
    const locationStub = { href: '' }
    Object.defineProperty(globalThis, 'location', { value: locationStub, writable: true })

    render(<PayButton bookingId="booking-1" midtransClientKey="client-key" />, { wrapper })

    // Simulasikan kegagalan memuat skrip Snap SEBELUM customer klik bayar —
    // ini persis `onError` yang next/script panggil kalau request skrip gagal.
    scriptProps.current?.onError?.()

    await userEvent.click(screen.getByRole('button', { name: /Bayar sekarang/ }))

    await waitFor(() => {
      expect(locationStub.href).toBe(
        'https://app.sandbox.midtrans.com/snap/v3/redirection/token-abc',
      )
    })
    expect(pay).not.toHaveBeenCalled()

    Object.defineProperty(globalThis, 'location', { value: originalLocation, writable: true })
  })

  it('script gagal dan tidak ada snap_redirect_url: menampilkan pesan error, bukan diam', async () => {
    paymentsPost.mockResolvedValue(
      Response.json(
        { data: { id: 'payment-1', snap_token: null, snap_redirect_url: null } },
        { status: 201 },
      ),
    )

    render(<PayButton bookingId="booking-1" midtransClientKey="client-key" />, { wrapper })
    scriptProps.current?.onError?.()

    await userEvent.click(screen.getByRole('button', { name: /Bayar sekarang/ }))

    expect(await screen.findByText(/Halaman pembayaran tidak dapat dibuka/)).toBeDefined()
  })

  it('I3: kegagalan jaringan (bukan HolaApiError) menampilkan fallback Indonesia, bukan teks Inggris mentah', async () => {
    paymentsPost.mockRejectedValue(new TypeError('Failed to fetch'))

    render(<PayButton bookingId="booking-1" midtransClientKey="client-key" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /Bayar sekarang/ }))

    expect(await screen.findByText('Pembayaran gagal disiapkan. Coba lagi.')).toBeDefined()
    expect(screen.queryByText('Failed to fetch')).toBeNull()
  })
})
