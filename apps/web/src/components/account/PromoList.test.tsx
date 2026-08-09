import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { promosGet } = vi.hoisted(() => ({ promosGet: vi.fn() }))

vi.mock('../../lib/api-client.ts', () => ({
  apiClient: { api: { v1: { promos: { available: { $get: promosGet } } } } },
}))

import { PromoList } from './PromoList.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const promo = {
  id: 'promo-1',
  code: null,
  name: 'Diskon Main Pagi',
  description: 'Main sebelum jam 10 pagi lebih hemat.',
  type: 'percent',
  value_percent: 20,
  value_amount: null,
  free_slot_count: null,
  max_discount_amount: 40_000,
  min_transaction_amount: 100_000,
  min_slot_count: null,
  applies_to: 'booking',
  quota_total: 100,
  quota_used: 60,
  quota_per_user: 1,
  valid_from: '2026-08-01T00:00:00.000Z',
  valid_until: '2026-08-31T16:00:00.000Z',
  is_auto: true,
  is_stackable: false,
  priority: 0,
  is_new_customer_only: false,
  min_tier_code: null,
  status: 'active',
}

function serve(rows: unknown[]): () => Promise<Response> {
  return () => Promise.resolve(Response.json({ data: rows }))
}

afterEach(() => {
  promosGet.mockReset()
})

describe('PromoList', () => {
  it('merangkai nilai promo dari angka yang dikirim API', async () => {
    promosGet.mockImplementation(serve([promo]))

    render(<PromoList />, { wrapper })

    expect(await screen.findByText('Diskon Main Pagi')).toBeDefined()
    expect(screen.getByText('Diskon 20% (maks Rp40.000)')).toBeDefined()
    expect(screen.getByText('Minimal transaksi Rp100.000')).toBeDefined()
    expect(screen.getByText('Sisa 40 kuota')).toBeDefined()
  })

  /**
   * `GET /promos/available` hanya mengembalikan promo `is_auto`, dan promo
   * otomatis selalu ber-`code` NULL — kartu tidak boleh menyuruh customer
   * menyalin kode yang tidak ada.
   */
  it('menandai promo sebagai otomatis dan tidak menampilkan kode untuk disalin', async () => {
    promosGet.mockImplementation(serve([promo]))

    render(<PromoList />, { wrapper })

    expect(await screen.findByText('Otomatis')).toBeDefined()
    expect(screen.queryByRole('button', { name: /Salin/i })).toBeNull()
  })

  it('menyembunyikan baris nilai saat jenis dan nilainya tidak cocok', async () => {
    promosGet.mockImplementation(serve([{ ...promo, value_percent: null }]))

    render(<PromoList />, { wrapper })

    expect(await screen.findByText('Diskon Main Pagi')).toBeDefined()
    expect(screen.queryByText(/Diskon 20%/)).toBeNull()
  })

  it('menampilkan keadaan kosong yang tetap menunjukkan jalan ke checkout', async () => {
    promosGet.mockImplementation(serve([]))

    render(<PromoList />, { wrapper })

    expect(await screen.findByText('Belum ada promo yang berjalan')).toBeDefined()
    expect(screen.getByRole('link', { name: 'Lihat lapangan' }).getAttribute('href')).toBe(
      '/lapangan',
    )
  })

  it('menawarkan coba lagi saat daftarnya gagal dimuat', async () => {
    promosGet.mockRejectedValue(new Error('offline'))

    render(<PromoList />, { wrapper })

    expect(await screen.findByText('Daftar promo gagal dimuat.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeDefined()
  })
})
