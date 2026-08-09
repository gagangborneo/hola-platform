import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { profileGet, profilePatch, sportsGet, verifyRequestPost } = vi.hoisted(() => ({
  profileGet: vi.fn(),
  profilePatch: vi.fn(),
  sportsGet: vi.fn(),
  verifyRequestPost: vi.fn(),
}))

// `apiClient` dimock, bukan `fetch` global: `createHolaClient` menangkap
// `globalThis.fetch` sekali saat modul dimuat, sebelum body test manapun jalan.
vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: {
      v1: {
        me: { profile: { $get: profileGet, $patch: profilePatch } },
        sports: { $get: sportsGet },
        auth: { email: { verify: { request: { $post: verifyRequestPost } } } },
      },
    },
  },
}))

import { ProfileForm } from './ProfileForm.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const baseProfile = {
  id: 'user-1',
  role: 'customer',
  email: 'pemain@hola.test',
  phone: '+628110000001',
  full_name: 'Rangga Bayu',
  avatar_media_id: null,
  email_verified_at: null,
  phone_verified_at: null,
  created_at: '2026-07-01T02:00:00+08:00',
  profile: {
    birth_date: '1997-06-12',
    gender: 'undisclosed',
    skill_level: 'beginner',
    preferred_sport_id: null,
    tier_code: 'bronze',
    lifetime_points: 120,
    referral_code: 'PRF001',
    notification_prefs: { push: true, email: true, whatsapp: false },
  },
}

const SPORTS = [{ id: 'sport-1', code: 'PADEL', name: 'Padel' }]

afterEach(() => {
  profileGet.mockReset()
  profilePatch.mockReset()
  sportsGet.mockReset()
  verifyRequestPost.mockReset()
})

function renderForm(profile: unknown = baseProfile): void {
  profileGet.mockResolvedValue(Response.json({ data: profile }))
  sportsGet.mockResolvedValue(Response.json({ data: SPORTS, meta: {} }))
  render(<ProfileForm />, { wrapper })
}

describe('ProfileForm', () => {
  it('mengisi form dari profil yang tersimpan, termasuk field khusus pelanggan', async () => {
    renderForm()

    expect(await screen.findByDisplayValue('Rangga Bayu')).toBeDefined()
    expect(screen.getByDisplayValue('+628110000001')).toBeDefined()
    expect(screen.getByDisplayValue('1997-06-12')).toBeDefined()
    // Keanggotaan datang dari API, bukan dihitung ulang di klien.
    expect(screen.getByText('PRF001')).toBeDefined()
  })

  it('mengirim hanya field yang dikenal kontrak PATCH /me/profile', async () => {
    renderForm()
    profilePatch.mockResolvedValue(
      Response.json({ data: { ...baseProfile, full_name: 'Rangga B.' } }),
    )

    const name = await screen.findByLabelText('Nama lengkap')
    fireEvent.change(name, { target: { value: 'Rangga B.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }))

    await waitFor(() => {
      expect(profilePatch).toHaveBeenCalled()
    })
    expect(profilePatch.mock.calls[0]?.[0]).toEqual({
      json: {
        full_name: 'Rangga B.',
        phone: '+628110000001',
        birth_date: '1997-06-12',
        gender: 'undisclosed',
        skill_level: 'beginner',
        preferred_sport_id: null,
      },
    })
    expect(await screen.findByText('Perubahan profil tersimpan.')).toBeDefined()
  })

  // F0-71: pesan validasi form datang dari schema yang sama dengan server.
  it('menolak nomor HP berformat salah sebelum menyentuh jaringan', async () => {
    renderForm()

    const phone = await screen.findByLabelText('Nomor HP')
    fireEvent.change(phone, { target: { value: '08110000001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }))

    expect(await screen.findByText('Nomor HP harus berformat +62…')).toBeDefined()
    expect(profilePatch).not.toHaveBeenCalled()
  })

  it('menawarkan kirim ulang verifikasi hanya saat email belum terverifikasi', async () => {
    renderForm()
    verifyRequestPost.mockResolvedValue(Response.json({ data: { message: 'ok' } }))

    fireEvent.click(await screen.findByRole('button', { name: 'Kirim tautan verifikasi' }))

    await waitFor(() => {
      expect(verifyRequestPost).toHaveBeenCalled()
    })
    expect(
      await screen.findByText('Tautan verifikasi dikirim. Cek kotak masuk email kamu.'),
    ).toBeDefined()
  })

  it('menyembunyikan field khusus pelanggan untuk akun tanpa customer_profiles', async () => {
    renderForm({ ...baseProfile, role: 'staff', profile: null })

    expect(await screen.findByDisplayValue('Rangga Bayu')).toBeDefined()
    expect(screen.queryByLabelText('Level bermain')).toBeNull()
    expect(screen.queryByText('Keanggotaan')).toBeNull()
  })

  it('menampilkan pesan error saat profil gagal dimuat', async () => {
    profileGet.mockRejectedValue(new Error('gagal'))
    sportsGet.mockResolvedValue(Response.json({ data: SPORTS, meta: {} }))
    render(<ProfileForm />, { wrapper })

    expect(await screen.findByText('Profil gagal dimuat.')).toBeDefined()
  })
})
