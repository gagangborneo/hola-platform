import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { inboxGet, readPost, readAllPost } = vi.hoisted(() => ({
  inboxGet: vi.fn(),
  readPost: vi.fn(),
  readAllPost: vi.fn(),
}))

vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: {
      v1: {
        me: {
          notifications: {
            $get: inboxGet,
            ':id': { read: { $post: readPost } },
            'read-all': { $post: readAllPost },
          },
        },
      },
    },
  },
}))

import { NotificationInbox } from './NotificationInbox.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const unread = {
  id: 'notif-1',
  template_code: 'booking.confirmed',
  payload: {},
  read_at: null,
  created_at: '2026-08-01T02:00:00+08:00',
  related_type: 'booking',
  related_id: 'booking-1',
}

const read = {
  ...unread,
  id: 'notif-2',
  template_code: 'auth.password_changed',
  read_at: '2026-08-01T03:00:00+08:00',
  related_type: 'user',
  related_id: 'user-1',
}

/**
 * Body sebuah `Response` hanya dapat dibaca sekali, sedangkan menandai
 * notifikasi dibaca memicu invalidasi lalu fetch kedua — jadi mock-nya membuat
 * response baru per panggilan, bukan mengembalikan instance yang sama.
 */
function servePage(rows: unknown[]): () => Promise<Response> {
  return () =>
    Promise.resolve(
      Response.json({
        data: rows,
        meta: { pagination: { mode: 'cursor', limit: 20, next_cursor: null, has_more: false } },
      }),
    )
}

afterEach(() => {
  inboxGet.mockReset()
  readPost.mockReset()
  readAllPost.mockReset()
})

describe('NotificationInbox', () => {
  it('menerjemahkan template_code ke bahasa Indonesia, bukan menampilkan kodenya (I1)', async () => {
    inboxGet.mockImplementation(servePage([unread, read]))

    render(<NotificationInbox />, { wrapper })

    expect(await screen.findByText('Booking terkonfirmasi')).toBeDefined()
    expect(screen.getByText('Password diubah')).toBeDefined()
    expect(screen.queryByText('booking.confirmed')).toBeNull()
  })

  it('hanya menautkan notifikasi yang punya halaman tujuan', async () => {
    inboxGet.mockImplementation(servePage([unread, read]))

    render(<NotificationInbox />, { wrapper })

    const links = await screen.findAllByRole('link', { name: /Lihat detail/ })
    expect(links).toHaveLength(1)
    expect(links[0]?.getAttribute('href')).toBe('/akun/booking/booking-1')
  })

  it('menandai satu notifikasi dibaca lalu memuat ulang daftarnya', async () => {
    inboxGet.mockImplementation(servePage([unread, read]))
    readPost.mockResolvedValue(new Response(null, { status: 204 }))

    render(<NotificationInbox />, { wrapper })

    fireEvent.click(await screen.findByRole('button', { name: 'Tandai dibaca' }))

    await waitFor(() => {
      expect(readPost).toHaveBeenCalledWith({ param: { id: 'notif-1' } })
    })
  })

  it('menyembunyikan aksi massal saat tidak ada yang belum dibaca', async () => {
    inboxGet.mockImplementation(servePage([read]))

    render(<NotificationInbox />, { wrapper })

    expect(await screen.findByText('Semua notifikasi sudah dibaca')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Tandai semua dibaca' })).toBeNull()
  })

  it('menandai semua dibaca dari satu tombol', async () => {
    inboxGet.mockImplementation(servePage([unread]))
    readAllPost.mockResolvedValue(new Response(null, { status: 204 }))

    render(<NotificationInbox />, { wrapper })

    fireEvent.click(await screen.findByRole('button', { name: 'Tandai semua dibaca' }))

    await waitFor(() => {
      expect(readAllPost).toHaveBeenCalled()
    })
  })

  it('menampilkan keadaan kosong, bukan daftar hampa', async () => {
    inboxGet.mockImplementation(servePage([]))

    render(<NotificationInbox />, { wrapper })

    expect(await screen.findByText('Belum ada notifikasi')).toBeDefined()
  })
})
