import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { changePost, setSession } = vi.hoisted(() => ({
  changePost: vi.fn(),
  setSession: vi.fn(),
}))

const sessionUser = {
  id: 'user-1',
  role: 'customer',
  email: 'pemain@hola.test',
  phone: null,
  fullName: 'Rangga Bayu',
}

vi.mock('../../lib/api-client.ts', () => ({
  apiClient: { api: { v1: { auth: { password: { change: { $post: changePost } } } } } },
}))

vi.mock('../../lib/auth.ts', () => ({
  authStore: { setSession },
  useAuthSession: () => ({ accessToken: 'token-lama', isReady: true, user: sessionUser }),
}))

import { PasswordChangeForm } from './PasswordChangeForm.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function fill(values: { current: string; next: string; confirm: string }): void {
  fireEvent.change(screen.getByLabelText('Password saat ini'), {
    target: { value: values.current },
  })
  fireEvent.change(screen.getByLabelText('Password baru'), { target: { value: values.next } })
  fireEvent.change(screen.getByLabelText('Ulangi password baru'), {
    target: { value: values.confirm },
  })
}

afterEach(() => {
  changePost.mockReset()
  setSession.mockReset()
})

describe('PasswordChangeForm', () => {
  /**
   * Server menaikkan `token_version` saat password berganti, jadi access token
   * lama mati seketika. Kalau token baru tidak dipasang, pengguna terlempar ke
   * halaman login tepat setelah berhasil mengganti passwordnya.
   */
  it('memasang access token baru tanpa menghapus identitas sesi', async () => {
    changePost.mockResolvedValue(
      Response.json({ data: { access_token: 'token-baru', expires_in: 900 } }),
    )
    render(<PasswordChangeForm />, { wrapper })

    fill({ current: 'PasswordLama123!', next: 'MagentaPaddle2026!', confirm: 'MagentaPaddle2026!' })
    fireEvent.click(screen.getByRole('button', { name: 'Ganti password' }))

    await waitFor(() => {
      expect(setSession).toHaveBeenCalledWith({ accessToken: 'token-baru', user: sessionUser })
    })
    expect(
      await screen.findByText('Password berhasil diubah. Perangkat lain otomatis dikeluarkan.'),
    ).toBeDefined()
  })

  it('menolak konfirmasi yang tidak sama sebelum menyentuh jaringan', async () => {
    render(<PasswordChangeForm />, { wrapper })

    fill({ current: 'PasswordLama123!', next: 'MagentaPaddle2026!', confirm: 'MagentaPaddle2027!' })
    fireEvent.click(screen.getByRole('button', { name: 'Ganti password' }))

    expect(
      await screen.findByText('Konfirmasi password tidak sama dengan password baru.'),
    ).toBeDefined()
    expect(changePost).not.toHaveBeenCalled()
  })

  it('menampilkan pesan server saat password lama salah', async () => {
    changePost.mockRejectedValue(new Error('gagal'))
    render(<PasswordChangeForm />, { wrapper })

    fill({ current: 'salah', next: 'MagentaPaddle2026!', confirm: 'MagentaPaddle2026!' })
    fireEvent.click(screen.getByRole('button', { name: 'Ganti password' }))

    expect(await screen.findByText('Password gagal diubah. Coba lagi.')).toBeDefined()
    expect(setSession).not.toHaveBeenCalled()
  })
})
