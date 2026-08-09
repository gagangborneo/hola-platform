'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { QueryState } from '../../../../components/common/QueryState.tsx'
import { StatusChip } from '../../../../components/common/StatusChip.tsx'
import { RoleRouteGuard } from '../../../../components/shell/RoleRouteGuard.tsx'
import { apiClient } from '../../../../lib/api-client.ts'
import { parseOffsetList } from '../../../../lib/api-response.ts'
import { isBookingResponse, normalizeBooking } from '../../../../lib/bookings.ts'
import { formatRupiah, formatShortDateWita } from '../../../../lib/format.ts'
import * as labels from '../../../../lib/labels.ts'

/**
 * Riwayat booking satu customer.
 *
 * API tidak punya `GET /admin/users/{id}`, jadi profilnya diambil dari daftar
 * booking-nya sendiri — cukup untuk pertanyaan meja depan, dan tidak berpura-pura
 * jadi CRM yang baru datang di Phase 2.
 */
function useCustomerBookings(customerUserId: string) {
  return useQuery({
    queryKey: ['customer-bookings', customerUserId],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings.$get({
        query: {
          customer_user_id: customerUserId,
          per_page: '50',
          sort: '-created_at',
        },
      })
      const list = parseOffsetList(await response.json(), isBookingResponse)
      return { ...list, data: list.data.map(normalizeBooking) }
    },
  })
}

function CustomerDetailPage(): ReactNode {
  const params = useParams<{ id: string }>()
  const customerUserId = typeof params.id === 'string' ? params.id : ''
  const bookings = useCustomerBookings(customerUserId)

  const rows = bookings.data?.data ?? []
  const spend = rows
    .filter((booking) => booking.status === 'confirmed' || booking.status === 'completed')
    .reduce((total, booking) => total + booking.totalAmount, 0)

  return (
    <section className="page-stack">
      <p className="breadcrumb">
        <Link href="/dashboard/customers">← Kembali ke daftar customer</Link>
      </p>

      <div className="page-heading">
        <p className="eyebrow">Customer</p>
        <h1>Riwayat booking</h1>
        <p>ID akun {customerUserId}</p>
      </div>

      <dl className="metric-grid">
        <div className="metric-card">
          <dt>Total booking</dt>
          <dd>{bookings.data?.pagination.totalCount ?? '—'}</dd>
          <small>Seluruh status</small>
        </div>
        <div className="metric-card">
          <dt>Nilai booking berjalan</dt>
          <dd>{formatRupiah(spend)}</dd>
          <small>Terkonfirmasi dan selesai, dari {rows.length} booking terbaru</small>
        </div>
      </dl>

      <div className="data-table-shell">
        <QueryState
          error={bookings.error}
          isEmpty={rows.length === 0}
          emptyMessage="Customer ini belum punya booking."
          isLoading={bookings.isLoading}
          onRetry={() => void bookings.refetch()}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Kode</th>
                  <th scope="col">Tanggal main</th>
                  <th scope="col">Slot</th>
                  <th scope="col">Kanal</th>
                  <th scope="col">Status</th>
                  <th scope="col">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <Link href={`/dashboard/bookings/${booking.id}`}>{booking.bookingCode}</Link>
                    </td>
                    <td>{formatShortDateWita(`${booking.bookingDate}T00:00:00+08:00`)}</td>
                    <td>{booking.slotCount} slot</td>
                    <td>
                      <StatusChip {...labels.bookingChannel(booking.channel)} />
                    </td>
                    <td>
                      <StatusChip {...labels.bookingStatus(booking.status)} />
                    </td>
                    <td className="numeric">{formatRupiah(booking.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <CustomerDetailPage />
    </RoleRouteGuard>
  )
}
