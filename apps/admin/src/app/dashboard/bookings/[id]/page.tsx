'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { BookingActions } from '../../../../components/bookings/BookingActions.tsx'
import { formErrorMessage } from '../../../../components/common/form-error.ts'
import { QueryState } from '../../../../components/common/QueryState.tsx'
import { StatusChip } from '../../../../components/common/StatusChip.tsx'
import { RoleRouteGuard } from '../../../../components/shell/RoleRouteGuard.tsx'
import { apiClient } from '../../../../lib/api-client.ts'
import { isRecord, parseData, parseOffsetList } from '../../../../lib/api-response.ts'
import { useAuthSession } from '../../../../lib/auth.ts'
import {
  addonLines,
  type BookingDetail,
  bookingPartyLabel,
  discountLines,
  feeLines,
  isBookingDetailResponse,
  normalizeBookingDetail,
} from '../../../../lib/bookings.ts'
import { courtsById, useCourts } from '../../../../lib/courts.ts'
import {
  formatDateTimeWita,
  formatDateWita,
  formatRupiah,
  formatSlotRange,
} from '../../../../lib/format.ts'
import * as labels from '../../../../lib/labels.ts'
import { isPaymentResponse, normalizePayment } from '../../../../lib/payments.ts'

function useBookingDetail(bookingId: string) {
  return useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: async (): Promise<BookingDetail> => {
      const response = await apiClient.api.v1.bookings[':id'].$get({ param: { id: bookingId } })
      return normalizeBookingDetail(parseData(await response.json(), isBookingDetailResponse))
    },
  })
}

/**
 * API tidak menyediakan `GET /bookings/{id}/payments`. Pencarian `q` pada daftar
 * pembayaran mencocokkan kode booking, lalu hasilnya disaring lagi di sini
 * supaya kode yang kebetulan mengandung substring yang sama tidak ikut tampil.
 */
function useBookingPayments(bookingId: string, bookingCode: string | undefined) {
  return useQuery({
    queryKey: ['booking-payments', bookingId],
    enabled: bookingCode !== undefined,
    queryFn: async () => {
      const response = await apiClient.api.v1.payments.$get({
        query: { q: bookingCode ?? '', per_page: '50' },
      })
      const list = parseOffsetList(await response.json(), isPaymentResponse)
      return list.data.map(normalizePayment).filter((payment) => payment.bookingId === bookingId)
    },
  })
}

interface AuditEntry {
  action: string
  actorRole: string | null
  createdAt: string
  id: string
}

function isAuditEntry(value: unknown): value is {
  action: string
  actor_role: string | null
  created_at: string
  id: string
} {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.action === 'string' &&
    typeof value.created_at === 'string' &&
    (typeof value.actor_role === 'string' || value.actor_role === null)
  )
}

function useBookingHistory(bookingId: string, isAdmin: boolean) {
  return useQuery({
    queryKey: ['booking-history', bookingId],
    enabled: isAdmin,
    queryFn: async (): Promise<AuditEntry[]> => {
      const response = await apiClient.api.v1.admin['audit-logs'].$get({
        query: {
          entity_type: 'booking',
          entity_id: bookingId,
          per_page: '50',
          sort: '-created_at',
        },
      })
      const list = parseOffsetList(await response.json(), isAuditEntry)
      return list.data.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorRole: entry.actor_role,
        createdAt: entry.created_at,
      }))
    },
  })
}

function PaymentsPanel({
  bookingCode,
  bookingId,
}: {
  bookingCode: string
  bookingId: string
}): ReactNode {
  const queryClient = useQueryClient()
  const payments = useBookingPayments(bookingId, bookingCode)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const sync = useMutation({
    mutationFn: async (paymentId: string): Promise<void> => {
      await apiClient.api.v1.payments[':id'].sync.$post({ param: { id: paymentId } })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['booking-payments', bookingId] })
      await queryClient.invalidateQueries({ queryKey: ['booking-detail', bookingId] })
    },
  })

  const onSync = async (paymentId: string): Promise<void> => {
    setError(null)
    setNotice(null)
    try {
      await sync.mutateAsync(paymentId)
      setNotice('Status pembayaran disinkronkan ulang dari gateway.')
    } catch (syncError) {
      setError(formErrorMessage(syncError))
    }
  }

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <h2>Pembayaran</h2>
          <p>
            Kalau customer mengaku sudah membayar tetapi status masih menunggu, jalankan
            sinkronisasi — status ditarik ulang langsung dari gateway.
          </p>
        </div>
      </div>
      <QueryState
        error={payments.error}
        isEmpty={(payments.data?.length ?? 0) === 0}
        emptyMessage="Belum ada pembayaran untuk booking ini."
        isLoading={payments.isLoading}
        onRetry={() => void payments.refetch()}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Kode</th>
                <th scope="col">Metode</th>
                <th scope="col">Nilai</th>
                <th scope="col">Status</th>
                <th scope="col">Dibayar</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(payments.data ?? []).map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.paymentCode}</td>
                  <td>{labels.paymentMethod(payment.method).label}</td>
                  <td className="numeric">{formatRupiah(payment.amount)}</td>
                  <td>
                    <StatusChip {...labels.paymentStatus(payment.status)} />
                    {payment.needsManualReview ? (
                      <>
                        {' '}
                        <StatusChip label="Perlu ditinjau" tone="warning" />
                      </>
                    ) : null}
                  </td>
                  <td>{payment.paidAt ? formatDateTimeWita(payment.paidAt) : '—'}</td>
                  <td>
                    <button
                      className="button-secondary button-small"
                      type="button"
                      onClick={() => void onSync(payment.id)}
                      disabled={sync.isPending}
                    >
                      Sinkronkan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="notice notice-success">{notice}</p> : null}
    </div>
  )
}

function HistoryPanel({ bookingId }: { bookingId: string }): ReactNode {
  const history = useBookingHistory(bookingId, true)
  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <h2>Riwayat</h2>
          <p>Jejak audit append-only untuk booking ini.</p>
        </div>
      </div>
      <QueryState
        error={history.error}
        isEmpty={(history.data?.length ?? 0) === 0}
        emptyMessage="Belum ada perubahan tercatat untuk booking ini."
        isLoading={history.isLoading}
        onRetry={() => void history.refetch()}
      >
        <ul className="stack-tight">
          {(history.data ?? []).map((entry) => (
            <li key={entry.id}>
              {formatDateTimeWita(entry.createdAt)} · <strong>{entry.action}</strong> ·{' '}
              {entry.actorRole ?? 'system'}
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  )
}

function BookingDetailPage(): ReactNode {
  const params = useParams<{ id: string }>()
  const bookingId = typeof params.id === 'string' ? params.id : ''
  const session = useAuthSession()
  const detail = useBookingDetail(bookingId)
  const courts = useCourts()
  const byId = courtsById(courts.data ?? [])
  const booking = detail.data

  return (
    <section className="page-stack">
      <p className="breadcrumb">
        <Link href="/dashboard/bookings">← Kembali ke daftar booking</Link>
      </p>

      <QueryState
        error={detail.error}
        isLoading={detail.isLoading}
        onRetry={() => void detail.refetch()}
      >
        {booking ? (
          <div className="page-stack">
            <div className="page-heading-row">
              <div className="page-heading">
                <p className="eyebrow">{labels.bookingChannel(booking.channel).label}</p>
                <h1>{booking.bookingCode}</h1>
                <p>
                  {formatDateWita(`${booking.bookingDate}T00:00:00+08:00`)} ·{' '}
                  {bookingPartyLabel(booking)}
                </p>
              </div>
              <StatusChip {...labels.bookingStatus(booking.status)} />
            </div>

            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Tindakan</h2>
                </div>
              </div>
              <BookingActions booking={booking} />
            </div>

            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Ringkasan</h2>
                </div>
              </div>
              <dl className="detail-grid">
                <div>
                  <dt>Total tagihan</dt>
                  <dd>{formatRupiah(booking.totalAmount)}</dd>
                </div>
                <div>
                  <dt>Jumlah slot</dt>
                  <dd>{booking.slotCount}</dd>
                </div>
                <div>
                  <dt>Nomor HP tamu</dt>
                  <dd>{booking.guestPhone ?? '—'}</dd>
                </div>
                <div>
                  <dt>Hold berakhir</dt>
                  <dd>{booking.holdExpiresAt ? formatDateTimeWita(booking.holdExpiresAt) : '—'}</dd>
                </div>
                <div>
                  <dt>Check-in</dt>
                  <dd>{booking.checkedInAt ? formatDateTimeWita(booking.checkedInAt) : 'Belum'}</dd>
                </div>
                <div>
                  <dt>Dibuat</dt>
                  <dd>{formatDateTimeWita(booking.createdAt)}</dd>
                </div>
                <div>
                  <dt>Catatan customer</dt>
                  <dd>{booking.customerNote ?? '—'}</dd>
                </div>
                <div>
                  <dt>Catatan internal</dt>
                  <dd>{booking.internalNote ?? '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Rincian</h2>
                  <p>
                    Angka diambil dari snapshot harga saat booking dibuat dan tidak pernah dihitung
                    ulang.
                  </p>
                </div>
              </div>
              <div className="table-scroll">
                <table className="line-table">
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">Waktu</th>
                      <th scope="col">Kelas</th>
                      <th scope="col">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.items.map((item) => (
                      <tr key={item.id}>
                        <td>{byId.get(item.courtId)?.name ?? 'Lapangan tidak dikenal'}</td>
                        <td>{formatSlotRange(item.startsAt, item.endsAt)}</td>
                        <td>
                          <StatusChip {...labels.rateClass(item.rateClass)} />
                        </td>
                        <td className="numeric">{formatRupiah(item.lineTotalAmount)}</td>
                      </tr>
                    ))}
                    {addonLines(booking.quote).map((line) => (
                      <tr key={`addon-${line.ref_id}`}>
                        <td>{line.label}</td>
                        <td>Addon</td>
                        <td>×{line.quantity}</td>
                        <td className="numeric">{formatRupiah(line.line_total_amount)}</td>
                      </tr>
                    ))}
                    {feeLines(booking.quote).map((line) => (
                      <tr key={`fee-${line.ref_id}`}>
                        <td>{line.label}</td>
                        <td>Biaya</td>
                        <td>—</td>
                        <td className="numeric">{formatRupiah(line.line_total_amount)}</td>
                      </tr>
                    ))}
                    {discountLines(booking.quote).map((line) => (
                      <tr key={`discount-${line.ref_id}`}>
                        <td>{line.label}</td>
                        <td>Diskon</td>
                        <td>—</td>
                        <td className="numeric">
                          −{formatRupiah(Math.abs(line.line_total_amount))}
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={3}>Total</td>
                      <td className="numeric">{formatRupiah(booking.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {booking.quote?.promo ? (
                <p className="muted">
                  Promo {booking.quote.promo.code} — {booking.quote.promo.name}
                </p>
              ) : null}
            </div>

            <PaymentsPanel bookingCode={booking.bookingCode} bookingId={booking.id} />

            {session.user?.role === 'admin' ? <HistoryPanel bookingId={booking.id} /> : null}
          </div>
        ) : null}
      </QueryState>
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin', 'staff']}>
      <BookingDetailPage />
    </RoleRouteGuard>
  )
}
