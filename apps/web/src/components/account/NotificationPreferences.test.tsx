import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { profileGet, prefsPut } = vi.hoisted(() => ({ profileGet: vi.fn(), prefsPut: vi.fn() }))

vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: {
      v1: { me: { profile: { $get: profileGet }, 'notification-prefs': { $put: prefsPut } } },
    },
  },
}))

import { NotificationPreferences } from './NotificationPreferences.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const customerProfile = {
  id: 'user-1',
  role: 'customer',
  email: 'pemain@hola.test',
  phone: null,
  full_name: 'Rangga Bayu',
  avatar_media_id: null,
  email_verified_at: null,
  phone_verified_at: null,
  created_at: '2026-07-01T02:00:00+08:00',
  profile: {
    birth_date: null,
    gender: null,
    skill_level: null,
    preferred_sport_id: null,
    tier_code: 'bronze',
    lifetime_points: 0,
    referral_code: 'PRF001',
    notification_prefs: { push: true, email: true, whatsapp: false },
  },
}

afterEach(() => {
  profileGet.mockReset()
  prefsPut.mockReset()
})

describe('NotificationPreferences', () => {
  // `PUT` mengganti seluruh objek, jadi kanal yang tidak disentuh harus ikut
  // terkirim apa adanya — kalau tidak, mematikan email diam-diam mematikan push.
  it('mengirim seluruh objek preferensi saat satu kanal diubah', async () => {
    // `mockImplementation`, bukan `mockResolvedValue`: body sebuah Response hanya
    // bisa dibaca sekali, sedangkan invalidasi cache memicu fetch kedua.
    profileGet.mockImplementation(() => Promise.resolve(Response.json({ data: customerProfile })))
    prefsPut.mockResolvedValue(
      Response.json({ data: { push: true, email: false, whatsapp: false } }),
    )

    render(<NotificationPreferences />, { wrapper })
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Email' }))

    await waitFor(() => {
      expect(prefsPut).toHaveBeenCalledWith({
        json: { push: true, email: false, whatsapp: false },
      })
    })
    expect(await screen.findByText('Preferensi notifikasi tersimpan.')).toBeDefined()
  })

  it('menyatakan bahwa notifikasi transaksional tetap dikirim', async () => {
    profileGet.mockResolvedValue(Response.json({ data: customerProfile }))

    render(<NotificationPreferences />, { wrapper })

    expect(await screen.findByText(/tetap\s+dikirim meskipun kanalnya dimatikan/)).toBeDefined()
  })

  it('tidak dirender untuk akun tanpa baris customer_profiles', async () => {
    profileGet.mockResolvedValue(Response.json({ data: { ...customerProfile, profile: null } }))

    const { container } = render(<NotificationPreferences />, { wrapper })

    await waitFor(() => {
      expect(container.querySelector('section')).toBeNull()
    })
  })
})
