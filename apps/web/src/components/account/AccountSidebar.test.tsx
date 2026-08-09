import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AuthSnapshot } from '../../lib/auth-store.ts'

const snapshot: AuthSnapshot = {
  accessToken: 'token',
  isReady: true,
  user: {
    id: 'user-1',
    role: 'customer',
    email: 'pemain@hola.test',
    phone: null,
    fullName: 'Rangga Bayu',
  },
}

const { replace, logout } = vi.hoisted(() => ({ replace: vi.fn(), logout: vi.fn() }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/akun/booking/booking-1',
  useRouter: () => ({ replace }),
}))

vi.mock('../../lib/auth.ts', () => ({ useAuthSession: () => snapshot }))

// `logout.ts` membaca `env` saat modul dimuat; mock-nya juga membuat test ini
// menguji perkabelan tombol keluar tanpa menyentuh jaringan.
vi.mock('../../lib/logout.ts', () => ({ logout }))

import { AccountSidebar } from './AccountSidebar.tsx'

describe('AccountSidebar', () => {
  it('menampilkan identitas akun, bukan hanya nama', () => {
    render(<AccountSidebar />)

    expect(screen.getByText('Rangga Bayu')).toBeDefined()
    expect(screen.getByText('pemain@hola.test')).toBeDefined()
  })

  it('menandai menu aktif meskipun sedang berada di halaman anaknya', () => {
    render(<AccountSidebar />)

    const desktopMenu = screen.getAllByRole('navigation', { name: 'Menu akun' })[0]
    const active = within(desktopMenu as HTMLElement).getByRole('link', { current: 'page' })

    expect(active.getAttribute('href')).toBe('/akun/booking')
  })

  it('menu yang halamannya belum ada tidak dapat diklik dan diberi lencana Segera', () => {
    render(<AccountSidebar />)

    const desktopMenu = screen.getAllByRole('navigation', { name: 'Menu akun' })[0] as HTMLElement
    const links = within(desktopMenu).getAllByRole('link')

    // Hanya menu yang halamannya sudah ada yang jadi tautan.
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/akun/booking',
      '/akun/profil',
      '/akun/notifikasi',
      '/akun/keamanan',
      '/jam-operasional',
    ])
    expect(within(desktopMenu).getAllByText('Segera').length).toBeGreaterThan(0)
  })

  it('tombol keluar mencabut sesi lalu kembali ke beranda', async () => {
    logout.mockResolvedValue(undefined)
    render(<AccountSidebar />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Keluar' })[0] as HTMLElement)

    await waitFor(() => {
      expect(logout).toHaveBeenCalled()
    })
    expect(replace).toHaveBeenCalledWith('/')
  })
})
