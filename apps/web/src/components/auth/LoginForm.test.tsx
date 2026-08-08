import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

// apiClient dipanggil via createHolaClient, yang mengunci `globalThis.fetch` saat modul
// dimuat (lihat task-12-report.md) — vi.stubGlobal('fetch', ...) tidak berpengaruh.
// Mock modulnya langsung, bukan fetch.
const { loginPost } = vi.hoisted(() => ({ loginPost: vi.fn() }))

vi.mock('../../lib/api-client.ts', () => ({
  apiClient: { api: { v1: { auth: { login: { $post: loginPost } } } } },
}))

const setAccessToken = vi.fn()

vi.mock('../../lib/auth.ts', () => ({
  authStore: { setAccessToken },
}))

const { LoginForm } = await import('./LoginForm.tsx')

async function submitLogin(): Promise<void> {
  render(<LoginForm />)
  fireEvent.change(screen.getByLabelText('Email atau nomor HP'), {
    target: { value: 'user@hola.test' },
  })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } })
  fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
  await waitFor(() => {
    expect(replace).toHaveBeenCalled()
  })
}

beforeEach(() => {
  loginPost.mockResolvedValue(Response.json({ data: { access_token: 'token-abc' } }))
})

afterEach(() => {
  replace.mockClear()
  loginPost.mockClear()
  setAccessToken.mockClear()
})

describe('LoginForm: tujuan pengalihan ?next= setelah login', () => {
  it('mengarahkan ke path internal yang sah', async () => {
    window.history.pushState({}, '', '/login?next=%2Fakun%2Fbooking')

    await submitLogin()

    expect(replace).toHaveBeenCalledWith('/akun/booking')
  })

  it('menolak next protocol-relative (//evil.example dinormalisasi jadi origin lain)', async () => {
    window.history.pushState({}, '', `/login?next=${encodeURIComponent('//evil.example')}`)

    await submitLogin()

    expect(replace).toHaveBeenCalledWith('/')
  })

  it('menolak next dengan backslash (dinormalisasi browser jadi slash, origin lain)', async () => {
    window.history.pushState({}, '', `/login?next=${encodeURIComponent('/\\evil.example')}`)

    await submitLogin()

    expect(replace).toHaveBeenCalledWith('/')
  })

  it('menolak next URL absolut ke origin lain', async () => {
    window.history.pushState({}, '', `/login?next=${encodeURIComponent('https://evil.example')}`)

    await submitLogin()

    expect(replace).toHaveBeenCalledWith('/')
  })

  it('menolak skema javascript:', async () => {
    window.history.pushState({}, '', `/login?next=${encodeURIComponent('javascript:alert(1)')}`)

    await submitLogin()

    expect(replace).toHaveBeenCalledWith('/')
  })

  it('next dengan spasi di depan tetap aman — resolve ke path internal, bukan origin lain', async () => {
    window.history.pushState({}, '', `/login?next=${encodeURIComponent(' /evil.example')}`)

    await submitLogin()

    // Parser URL WHATWG memangkas spasi di depan sebelum resolve; hasilnya tetap
    // path di origin kita sendiri ("/evil.example"), bukan pengalihan ke domain lain —
    // jadi ini valid diterima, bukan sekadar lolos oleh kecelakaan seperti pada
    // `startsWith('/')` versi lama.
    expect(replace).toHaveBeenCalledWith('/evil.example')
  })

  it('tanpa ?next= mengarahkan ke beranda', async () => {
    window.history.pushState({}, '', '/login')

    await submitLogin()

    expect(replace).toHaveBeenCalledWith('/')
  })
})
