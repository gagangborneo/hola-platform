import { render } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}))

// `authStore.restoreSession` sungguhan memanggil `apiClient` (yang mengimpor
// `env.ts`, yang mem-parse env di import time) — tidak relevan untuk test
// ini dan tanpa `.env` di-source akan melempar. Dimock sebagai no-op.
vi.mock('../lib/auth.ts', () => ({
  authStore: { restoreSession: vi.fn().mockResolvedValue(undefined) },
}))

import { Providers } from './providers.tsx'

function setLocation(pathname: string, search: string): void {
  Object.defineProperty(globalThis, 'location', {
    value: { pathname, search },
    writable: true,
    configurable: true,
  })
}

afterEach(() => {
  routerPush.mockReset()
})

describe('I5: pemulihan otomatis dari /offline', () => {
  it('menyimpan pathname + query string (bukan cuma pathname) dan mengembalikannya saat online', async () => {
    setLocation('/booking/booking-1/status', '?payment=payment-1')
    render(
      <Providers>
        <div />
      </Providers>,
    )

    await act(async () => {
      globalThis.dispatchEvent(new Event('offline'))
    })
    expect(routerPush).toHaveBeenCalledWith('/offline')

    await act(async () => {
      globalThis.dispatchEvent(new Event('online'))
    })
    // Tanpa query string ikut tersimpan, ini akan jadi '/booking/booking-1/status' saja —
    // yang men-trigger notFound() di halaman status pembayaran (I5).
    expect(routerPush).toHaveBeenLastCalledWith('/booking/booking-1/status?payment=payment-1')
  })

  it('I5: flap offline→online cepat tetap mengoreksi walau location.pathname belum sempat ter-commit ke /offline', async () => {
    // Sengaja TIDAK mengubah location ke '/offline' di antara kedua event ini — persis
    // kondisi race yang dijelaskan di providers.tsx: router.push('/offline') bersifat
    // async, jadi location.pathname mungkin belum berubah saat 'online' menyusul cepat.
    setLocation('/lapangan', '?olahraga=sport-1')
    render(
      <Providers>
        <div />
      </Providers>,
    )

    await act(async () => {
      globalThis.dispatchEvent(new Event('offline'))
      globalThis.dispatchEvent(new Event('online'))
    })

    expect(routerPush).toHaveBeenCalledWith('/offline')
    expect(routerPush).toHaveBeenLastCalledWith('/lapangan?olahraga=sport-1')
  })

  it('online saat memang belum pernah offline tidak memicu navigasi', async () => {
    setLocation('/', '')
    render(
      <Providers>
        <div />
      </Providers>,
    )

    await act(async () => {
      globalThis.dispatchEvent(new Event('online'))
    })

    expect(routerPush).not.toHaveBeenCalled()
  })
})
