import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { refundsGet } = vi.hoisted(() => ({ refundsGet: vi.fn() }))

vi.mock('../../lib/api-client.ts', () => ({
  apiClient: { api: { v1: { refunds: { $get: refundsGet } } } },
}))

import { RefundList } from './RefundList.tsx'

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const requested = {
  id: 'refund-1',
  refund_code: 'RF-2608-0001',
  payment_id: 'payment-1',
  amount: 90_000,
  status: 'requested',
  channel: 'manual_transfer',
  reason: 'Berhalangan hadir',
  policy_applied: 'option_b_50_percent',
  approved_at: null,
  completed_at: null,
  failure_reason: null,
  created_at: '2026-08-01T02:00:00.000Z',
}

const completed = {
  ...requested,
  id: 'refund-2',
  refund_code: 'RF-2608-0002',
  status: 'completed',
  approved_at: '2026-08-02T02:00:00.000Z',
  completed_at: '2026-08-04T02:00:00.000Z',
}

function serve(rows: unknown[]): () => Promise<Response> {
  return () => Promise.resolve(Response.json({ data: rows, meta: {} }))
}

afterEach(() => {
  refundsGet.mockReset()
})

describe('RefundList', () => {
  it('menerjemahkan status dan kebijakan refund, bukan menampilkan enum mentah (I1)', async () => {
    refundsGet.mockImplementation(serve([requested]))

    render(<RefundList cancellationPolicyText={null} />, { wrapper })

    expect(await screen.findByText('Diajukan')).toBeDefined()
    expect(screen.getByText('Pengembalian 50%')).toBeDefined()
    expect(screen.getByText('Transfer bank')).toBeDefined()
    expect(screen.queryByText('option_b_50_percent')).toBeNull()
  })

  it('menyebut kapan dana benar-benar dikirim untuk refund yang selesai', async () => {
    refundsGet.mockImplementation(serve([completed]))

    render(<RefundList cancellationPolicyText={null} />, { wrapper })

    expect(await screen.findByText(/Dana dikirim/)).toBeDefined()
    expect(screen.queryByText(/dana sedang diproses/)).toBeNull()
  })

  /**
   * Customer tidak bisa mengajukan refund sendiri (`POST /refunds` dibatasi
   * staff/admin) — halaman ini tidak boleh menjanjikan tombol yang tidak ada.
   */
  it('tidak menawarkan pengajuan refund mandiri', async () => {
    refundsGet.mockImplementation(serve([requested]))

    render(<RefundList cancellationPolicyText={null} />, { wrapper })

    await screen.findByText('Diajukan')
    expect(screen.queryByRole('button', { name: /Ajukan refund/i })).toBeNull()
  })

  it('menampilkan teks kebijakan venue apa adanya saat tersedia', async () => {
    refundsGet.mockImplementation(serve([]))

    render(<RefundList cancellationPolicyText="Refund 50% di atas 24 jam." />, { wrapper })

    expect(await screen.findByText('Refund 50% di atas 24 jam.')).toBeDefined()
  })

  it('menampilkan keadaan kosong, bukan daftar hampa', async () => {
    refundsGet.mockImplementation(serve([]))

    render(<RefundList cancellationPolicyText={null} />, { wrapper })

    expect(await screen.findByText('Belum ada pengajuan refund')).toBeDefined()
  })

  it('menganggap respons yang tidak dapat dibaca sebagai kegagalan, bukan daftar kosong', async () => {
    refundsGet.mockImplementation(() => Promise.resolve(Response.json({ data: [{ id: 'x' }] })))

    render(<RefundList cancellationPolicyText={null} />, { wrapper })

    expect(await screen.findByText('Daftar refund gagal dimuat.')).toBeDefined()
    expect(screen.queryByText('Belum ada pengajuan refund')).toBeNull()
  })
})
