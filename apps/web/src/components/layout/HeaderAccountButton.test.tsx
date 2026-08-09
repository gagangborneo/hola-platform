import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AuthSnapshot } from '../../lib/auth-store.ts'

const snapshot: AuthSnapshot = { accessToken: null, isReady: true, user: null }

vi.mock('../../lib/auth.ts', () => ({ useAuthSession: () => snapshot }))

const { HeaderAccountButton } = await import('./HeaderAccountButton.tsx')

describe('HeaderAccountButton', () => {
  it('menawarkan Masuk selama belum ada sesi', () => {
    snapshot.accessToken = null
    snapshot.user = null

    render(<HeaderAccountButton />)

    expect(screen.getByRole('link', { name: 'Masuk' }).getAttribute('href')).toBe('/login')
  })

  it('berubah jadi identitas akun (email/HP) yang menuju halaman akun', () => {
    snapshot.accessToken = 'token'
    snapshot.user = {
      id: 'user-1',
      role: 'customer',
      email: null,
      phone: '081234567890',
      fullName: 'Rangga Bayu',
    }

    render(<HeaderAccountButton />)

    const link = screen.getByRole('link', { name: /081234567890/u })
    expect(link.getAttribute('href')).toBe('/akun/booking')
  })
})
