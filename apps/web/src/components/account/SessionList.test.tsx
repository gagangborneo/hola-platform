import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { sessionsGet, sessionDelete, logoutAllPost, replace, clearAccessToken } = vi.hoisted(() => ({
  sessionsGet: vi.fn(),
  sessionDelete: vi.fn(),
  logoutAllPost: vi.fn(),
  replace: vi.fn(),
  clearAccessToken: vi.fn(),
}))

vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: {
      v1: {
        auth: {
          sessions: { $get: sessionsGet, ':id': { $delete: sessionDelete } },
          'logout-all': { $post: logoutAllPost },
        },
      },
    },
  },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

vi.mock('../../lib/auth.ts', () => ({ authStore: { clearAccessToken } }))

import { SessionList } from './SessionList.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const session = {
  id: 'session-1',
  device_label: null,
  ip_address: '103.10.10.10',
  user_agent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  created_at: '2026-08-01T02:00:00+08:00',
  last_used_at: '2026-08-02T02:00:00+08:00',
  expires_at: '2026-09-01T02:00:00+08:00',
}

afterEach(() => {
  sessionsGet.mockReset()
  sessionDelete.mockReset()
  logoutAllPost.mockReset()
  replace.mockReset()
  clearAccessToken.mockReset()
})

describe('SessionList', () => {
  it('menamai perangkat dari User-Agent dan menyebut kapan terakhir dipakai', async () => {
    sessionsGet.mockResolvedValue(Response.json({ data: [session] }))

    render(<SessionList />, { wrapper })

    expect(await screen.findByText('Chrome di macOS')).toBeDefined()
    expect(screen.getByText('IP 103.10.10.10')).toBeDefined()
  })

  it('mengeluarkan satu perangkat lewat id sesinya', async () => {
    sessionsGet.mockResolvedValue(Response.json({ data: [session] }))
    sessionDelete.mockResolvedValue(new Response(null, { status: 204 }))

    render(<SessionList />, { wrapper })
    fireEvent.click(await screen.findByRole('button', { name: 'Keluarkan' }))

    await waitFor(() => {
      expect(sessionDelete).toHaveBeenCalledWith({ param: { id: 'session-1' } })
    })
  })

  // `logout-all` menaikkan token_version, jadi access token tab ini ikut mati:
  // sesi lokal wajib dibersihkan, bukan dibiarkan menabrak 401 berikutnya.
  it('membersihkan sesi lokal dan mengarahkan ke login setelah keluar dari semua perangkat', async () => {
    sessionsGet.mockResolvedValue(Response.json({ data: [session] }))
    logoutAllPost.mockResolvedValue(new Response(null, { status: 204 }))

    render(<SessionList />, { wrapper })
    // Tombolnya nonaktif selama daftar belum termuat, jadi tunggu barisnya dulu.
    await screen.findByText('Chrome di macOS')
    fireEvent.click(screen.getByRole('button', { name: /Keluar dari semua perangkat/ }))

    await waitFor(() => {
      expect(clearAccessToken).toHaveBeenCalled()
    })
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('menampilkan pesan gagal saat daftar perangkat tidak dapat dimuat', async () => {
    sessionsGet.mockRejectedValue(new Error('gagal'))

    render(<SessionList />, { wrapper })

    expect(await screen.findByText('Daftar perangkat gagal dimuat.')).toBeDefined()
  })
})
