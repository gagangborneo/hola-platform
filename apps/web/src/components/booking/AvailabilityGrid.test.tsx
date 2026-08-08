import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AvailabilityGrid } from './AvailabilityGrid.tsx'

const { availabilityGet } = vi.hoisted(() => ({ availabilityGet: vi.fn() }))

/**
 * `apiClient` dimock di sini, bukan `fetch` global. `createHolaClient`
 * (packages/api-client) menangkap `globalThis.fetch` sekali saat modulnya
 * dimuat — yaitu saat baris impor di atas dievaluasi, SEBELUM badan test mana
 * pun berjalan. `vi.stubGlobal('fetch', ...)` yang dipanggil di dalam `it()`
 * karena itu tidak pernah dilihat oleh client: closure-nya sudah menyimpan
 * referensi `fetch` asli, dan request sungguhan akan keluar ke jaringan
 * (dibuktikan lewat panggilan manual: request nyata ke `localhost:4000`
 * muncul di log meskipun fetch sudah di-stub). Memock modul
 * `../../lib/api-client.ts` langsung menghindari jebakan itu sekaligus
 * menghindari validasi `env.ts` asli (yang butuh env var `NEXT_PUBLIC_*` yang
 * tidak tersedia saat `vitest run` dipanggil tanpa `apps/web/.env` di-source).
 */
vi.mock('../../lib/api-client.ts', () => ({
  apiClient: {
    api: { v1: { courts: { ':court_id': { availability: { $get: availabilityGet } } } } },
  },
}))

const day = {
  court_code: 'PDL-01',
  date: '2026-08-10',
  slot_duration_minutes: 60,
  day_type: 'weekday',
  slots: [
    {
      starts_at: '2026-08-10T06:00:00+08:00',
      ends_at: '2026-08-10T07:00:00+08:00',
      is_available: true,
      unavailable_reason: null,
      rate_class: 'offpeak',
      price_amount: 150000,
    },
    {
      starts_at: '2026-08-10T19:00:00+08:00',
      ends_at: '2026-08-10T20:00:00+08:00',
      is_available: false,
      unavailable_reason: 'booking',
      rate_class: 'peak',
      price_amount: 250000,
    },
  ],
}

function mockAvailability(warnings: { code: string }[] = []): void {
  availabilityGet.mockResolvedValue(
    Response.json({
      data: { court_id: 'court-1', days: [day] },
      meta: { generated_at: '2026-08-08T10:00:00+08:00', warnings },
    }),
  )
}

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  availabilityGet.mockReset()
})

describe('AvailabilityGrid', () => {
  it('P1-73: slot terisi disabled dan menampilkan label alasan', async () => {
    mockAvailability()
    render(
      <AvailabilityGrid
        courtId="court-1"
        horizonDays={14}
        serverTime="2026-08-08T10:00:00+08:00"
        onSelectionChange={() => undefined}
      />,
      { wrapper },
    )

    const taken = await screen.findByRole('button', { name: /19\.00/ })
    expect(taken.hasAttribute('disabled')).toBe(true)
    expect(taken.textContent).toContain('Sudah dipesan')
  })

  it('P1-73: slot tersedia dapat dipilih dan melaporkan pilihannya', async () => {
    mockAvailability()
    const onSelectionChange = vi.fn()
    render(
      <AvailabilityGrid
        courtId="court-1"
        horizonDays={14}
        serverTime="2026-08-08T10:00:00+08:00"
        onSelectionChange={onSelectionChange}
      />,
      { wrapper },
    )

    await userEvent.click(await screen.findByRole('button', { name: /06\.00/ }))

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith([
        expect.objectContaining({ starts_at: '2026-08-10T06:00:00+08:00' }),
      ])
    })
  })

  it('E-11: peringatan horizon menampilkan keterangan, bukan error', async () => {
    mockAvailability([{ code: 'BEYOND_BOOKING_HORIZON' }])
    render(
      <AvailabilityGrid
        courtId="court-1"
        horizonDays={14}
        serverTime="2026-08-08T10:00:00+08:00"
        onSelectionChange={() => undefined}
      />,
      { wrapper },
    )

    expect(await screen.findByText(/Belum dibuka untuk pemesanan/)).toBeDefined()
  })

  it('C2: hari tanpa slot (tutup) menampilkan pesan eksplisit, bukan grid kosong', async () => {
    availabilityGet.mockResolvedValue(
      Response.json({
        data: { court_id: 'court-1', days: [{ ...day, slots: [] }] },
        meta: { generated_at: '2026-08-08T10:00:00+08:00', warnings: [] },
      }),
    )
    render(
      <AvailabilityGrid
        courtId="court-1"
        horizonDays={14}
        serverTime="2026-08-08T10:00:00+08:00"
        onSelectionChange={() => undefined}
      />,
      { wrapper },
    )

    expect(await screen.findByText('Lapangan tutup pada tanggal ini')).toBeDefined()
    expect(screen.queryByText(/Tidak ada slot yang bisa dipesan untuk tanggal ini/)).toBeDefined()
  })

  it('P1-73: waktu pembuatan data ditampilkan agar customer tahu kesegarannya', async () => {
    mockAvailability()
    render(
      <AvailabilityGrid
        courtId="court-1"
        horizonDays={14}
        serverTime="2026-08-08T10:00:00+08:00"
        onSelectionChange={() => undefined}
      />,
      { wrapper },
    )

    expect(await screen.findByText(/Diperbarui 10\.00/)).toBeDefined()
  })
})
