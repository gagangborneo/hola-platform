'use client'

import { buttonVariants } from '@hola/ui'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { Suspense, useState } from 'react'
import { formErrorMessage } from '../../../components/common/form-error.ts'
import { StatusChip } from '../../../components/common/StatusChip.tsx'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import {
  DataTable,
  type TableColumn,
  type TableQuery,
} from '../../../components/table/DataTable.tsx'
import { apiClient } from '../../../lib/api-client.ts'
import { parseOffsetList } from '../../../lib/api-response.ts'
import {
  type Booking,
  bookingPartyLabel,
  isBookingChannel,
  isBookingResponse,
  isBookingStatus,
  normalizeBooking,
} from '../../../lib/bookings.ts'
import { useCourts } from '../../../lib/courts.ts'
import { formatRupiah, formatShortDateWita } from '../../../lib/format.ts'
import * as labels from '../../../lib/labels.ts'

type BookingSort = '-created_at' | 'booking_date'

function parseSort(value: string): BookingSort {
  return value === 'booking_date' ? 'booking_date' : '-created_at'
}

/** `YYYY-MM-DD`; nilai lain dari URL diabaikan alih-alih dikirim ke API. */
function parseDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

const columns: ReadonlyArray<TableColumn<Booking>> = [
  {
    key: 'booking_code',
    header: 'Kode',
    render: (booking) => (
      <Link href={`/dashboard/bookings/${booking.id}`}>{booking.bookingCode}</Link>
    ),
  },
  {
    key: 'booking_date',
    header: 'Tanggal main',
    sortable: true,
    render: (booking) => formatShortDateWita(`${booking.bookingDate}T00:00:00+08:00`),
  },
  { key: 'party', header: 'Pemesan', render: bookingPartyLabel },
  { key: 'slot_count', header: 'Slot', render: (booking) => `${booking.slotCount} slot` },
  {
    key: 'channel',
    header: 'Kanal',
    render: (booking) => <StatusChip {...labels.bookingChannel(booking.channel)} />,
  },
  {
    key: 'status',
    header: 'Status',
    render: (booking) => <StatusChip {...labels.bookingStatus(booking.status)} />,
  },
  {
    key: 'total_amount',
    header: 'Nilai',
    render: (booking) => formatRupiah(booking.totalAmount),
  },
]

function BookingsTable(): ReactNode {
  const searchParams = useSearchParams()
  const courts = useCourts()
  // Nilai awal dibaca dari URL supaya tautan dari dashboard ("perlu
  // ditindaklanjuti", "booking hari ini") mendarat dengan filter yang benar.
  const [tableQuery, setTableQuery] = useState<TableQuery>(() => {
    const status = searchParams.get('status') ?? ''
    const date = parseDate(searchParams.get('date') ?? undefined)
    return {
      page: 1,
      perPage: 25,
      q: '',
      sort: '-created_at',
      filters: {
        ...(isBookingStatus(status) ? { status } : {}),
        ...(date ? { booking_date_from: date, booking_date_to: date } : {}),
      },
    }
  })

  const query = useQuery({
    queryKey: ['admin-bookings', tableQuery],
    queryFn: async () => {
      const status = tableQuery.filters.status
      const channel = tableQuery.filters.channel
      const courtId = tableQuery.filters.court_id
      const response = await apiClient.api.v1.bookings.$get({
        query: {
          page: String(tableQuery.page),
          per_page: String(tableQuery.perPage),
          sort: parseSort(tableQuery.sort),
          ...(tableQuery.q ? { q: tableQuery.q } : {}),
          ...(isBookingStatus(status) ? { status } : {}),
          ...(isBookingChannel(channel) ? { channel } : {}),
          ...(courtId ? { court_id: courtId } : {}),
          ...(parseDate(tableQuery.filters.booking_date_from)
            ? { booking_date_from: tableQuery.filters.booking_date_from }
            : {}),
          ...(parseDate(tableQuery.filters.booking_date_to)
            ? { booking_date_to: tableQuery.filters.booking_date_to }
            : {}),
        },
      })
      const list = parseOffsetList(await response.json(), isBookingResponse)
      return { ...list, data: list.data.map(normalizeBooking) }
    },
  })

  return (
    <DataTable
      columns={columns}
      data={query.data?.data ?? []}
      emptyMessage="Tidak ada booking yang cocok dengan filter."
      error={query.error ? new Error(formErrorMessage(query.error)) : null}
      filters={[
        {
          key: 'status',
          label: 'Status',
          options: [
            { value: 'pending_payment', label: 'Menunggu pembayaran' },
            { value: 'confirmed', label: 'Terkonfirmasi' },
            { value: 'completed', label: 'Selesai' },
            { value: 'cancelled', label: 'Dibatalkan' },
            { value: 'expired', label: 'Kedaluwarsa' },
            { value: 'no_show', label: 'Tidak hadir' },
          ],
        },
        {
          key: 'channel',
          label: 'Kanal',
          options: [
            { value: 'web', label: 'Web' },
            { value: 'mobile', label: 'Mobile' },
            { value: 'admin', label: 'Admin' },
            { value: 'walk_in', label: 'Walk-in' },
          ],
        },
        {
          key: 'court_id',
          label: 'Lapangan',
          options: (courts.data ?? []).map((court) => ({ value: court.id, label: court.name })),
        },
        { key: 'booking_date_from', label: 'Tanggal main dari', placeholder: 'YYYY-MM-DD' },
        { key: 'booking_date_to', label: 'Tanggal main sampai', placeholder: 'YYYY-MM-DD' },
      ]}
      getRowKey={(booking) => booking.id}
      isLoading={query.isLoading}
      onQueryChange={setTableQuery}
      onRetry={() => void query.refetch()}
      pagination={query.data?.pagination}
      query={tableQuery}
      searchPlaceholder="Cari kode booking, nama, atau nomor HP"
    />
  )
}

function BookingsPage(): ReactNode {
  return (
    <section className="page-stack">
      <div className="page-heading-row">
        <div className="page-heading">
          <p className="eyebrow">Operasional</p>
          <h1>Booking</h1>
          <p>Seluruh kanal dalam satu tabel. Klik kode booking untuk detail dan tindakan.</p>
        </div>
        <Link className={buttonVariants()} href="/dashboard/bookings/new">
          Booking manual
        </Link>
      </div>
      {/* `useSearchParams` menuntut boundary Suspense di App Router. */}
      <Suspense fallback={<p className="table-state">Memuat filter…</p>}>
        <BookingsTable />
      </Suspense>
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin', 'staff']}>
      <BookingsPage />
    </RoleRouteGuard>
  )
}
