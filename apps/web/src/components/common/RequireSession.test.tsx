import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/checkout',
}))

const snapshot = { accessToken: null as string | null, isReady: false }

vi.mock('../../lib/auth.ts', () => ({
  authStore: {
    subscribe: () => () => undefined,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => ({ accessToken: null, isReady: false }),
    restoreSession: async () => snapshot.accessToken,
  },
}))

const { RequireSession } = await import('./RequireSession.tsx')

afterEach(() => {
  replace.mockClear()
})

describe('RequireSession', () => {
  it('menahan render sampai pemulihan sesi selesai', () => {
    snapshot.accessToken = null
    snapshot.isReady = false

    render(
      <RequireSession>
        <p>rahasia</p>
      </RequireSession>,
    )

    expect(screen.queryByText('rahasia')).toBeNull()
    expect(replace).not.toHaveBeenCalled()
  })

  it('mengalihkan ke login dengan tujuan kembali saat tidak ada sesi', async () => {
    snapshot.accessToken = null
    snapshot.isReady = true

    render(
      <RequireSession>
        <p>rahasia</p>
      </RequireSession>,
    )

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login?next=%2Fcheckout')
    })
    expect(screen.queryByText('rahasia')).toBeNull()
  })

  it('merender isi saat sesi tersedia', () => {
    snapshot.accessToken = 'token'
    snapshot.isReady = true

    render(
      <RequireSession>
        <p>rahasia</p>
      </RequireSession>,
    )

    expect(screen.getByText('rahasia')).toBeDefined()
    expect(replace).not.toHaveBeenCalled()
  })
})
