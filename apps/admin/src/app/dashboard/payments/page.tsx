'use client'

import { Button, Input, NativeSelect } from '@hola/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { formErrorMessage } from '../../../components/common/form-error.ts'
import { QueryState } from '../../../components/common/QueryState.tsx'
import { StatusChip } from '../../../components/common/StatusChip.tsx'
import { RefundActions } from '../../../components/payments/RefundActions.tsx'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import { apiClient } from '../../../lib/api-client.ts'
import { parseOffsetList } from '../../../lib/api-response.ts'
import { useAuthSession } from '../../../lib/auth.ts'
import { formatDateTimeWita, formatRupiah } from '../../../lib/format.ts'
import * as labels from '../../../lib/labels.ts'
import {
  isPaymentResponse,
  isRefundResponse,
  normalizePayment,
  normalizeRefund,
} from '../../../lib/payments.ts'

const PAYMENT_STATUSES = ['pending', 'paid', 'expired', 'failed', 'cancelled'] as const
type PaymentStatusFilter = (typeof PAYMENT_STATUSES)[number]

const REFUND_STATUSES = [
  'requested',
  'approved',
  'processing',
  'completed',
  'rejected',
  'failed',
] as const
type RefundStatusFilter = (typeof REFUND_STATUSES)[number]

function isPaymentStatusFilter(value: string): value is PaymentStatusFilter {
  return (PAYMENT_STATUSES as readonly string[]).includes(value)
}

function isRefundStatusFilter(value: string): value is RefundStatusFilter {
  return (REFUND_STATUSES as readonly string[]).includes(value)
}

function usePayments(status: string, search: string) {
  return useQuery({
    queryKey: ['admin-payments', status, search],
    queryFn: async () => {
      const response = await apiClient.api.v1.payments.$get({
        query: {
          per_page: '50',
          ...(isPaymentStatusFilter(status) ? { status } : {}),
          ...(search.trim().length > 0 ? { q: search.trim() } : {}),
        },
      })
      const list = parseOffsetList(await response.json(), isPaymentResponse)
      return { ...list, data: list.data.map(normalizePayment) }
    },
  })
}

function useRefunds(status: string) {
  return useQuery({
    queryKey: ['admin-refunds', status],
    queryFn: async () => {
      const response = await apiClient.api.v1.refunds.$get({
        query: { per_page: '50', ...(isRefundStatusFilter(status) ? { status } : {}) },
      })
      const list = parseOffsetList(await response.json(), isRefundResponse)
      return { ...list, data: list.data.map(normalizeRefund) }
    },
  })
}

function PaymentsPanel(): ReactNode {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const payments = usePayments(status, search)

  const sync = useMutation({
    mutationFn: async (paymentId: string): Promise<void> => {
      await apiClient.api.v1.payments[':id'].sync.$post({ param: { id: paymentId } })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
    },
  })

  const onSync = async (paymentId: string): Promise<void> => {
    setError(null)
    setNotice(null)
    try {
      await sync.mutateAsync(paymentId)
      setNotice('Status ditarik ulang dari gateway.')
    } catch (syncError) {
      setError(formErrorMessage(syncError))
    }
  }

  return (
    <div className="data-table-shell">
      <div className="table-controls">
        <label className="table-search">
          <span className="sr-only">Pencarian</span>
          <Input
            value={search}
            placeholder="Cari kode pembayaran atau kode booking"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="table-filter" htmlFor="payment-status">
          <span>Status</span>
          <NativeSelect
            id="payment-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua</option>
            <option value="pending">Menunggu pembayaran</option>
            <option value="paid">Dibayar</option>
            <option value="expired">Kedaluwarsa</option>
            <option value="failed">Gagal</option>
            <option value="cancelled">Dibatalkan</option>
          </NativeSelect>
        </label>
      </div>

      <QueryState
        error={payments.error}
        isEmpty={(payments.data?.data.length ?? 0) === 0}
        emptyMessage="Tidak ada pembayaran yang cocok."
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
                <th scope="col">Booking</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(payments.data?.data ?? []).map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.paymentCode}</td>
                  <td>{labels.paymentMethod(payment.method).label}</td>
                  <td className="numeric">
                    {formatRupiah(payment.amount)}
                    {payment.refundedAmount > 0 ? (
                      <>
                        <br />
                        <small>−{formatRupiah(payment.refundedAmount)} dikembalikan</small>
                      </>
                    ) : null}
                  </td>
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
                    <Link href={`/dashboard/bookings/${payment.bookingId}`}>Buka booking</Link>
                  </td>
                  <td>
                    <Button
                      onClick={() => void onSync(payment.id)}
                      disabled={sync.isPending}
                      variant="secondary"
                      size="sm"
                    >
                      Sinkronkan
                    </Button>
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

function RefundsPanel({ isAdmin }: { isAdmin: boolean }): ReactNode {
  const [status, setStatus] = useState('')
  const refunds = useRefunds(status)

  return (
    <div className="data-table-shell">
      <div className="table-controls">
        <label className="table-filter" htmlFor="refund-status">
          <span>Status</span>
          <NativeSelect
            id="refund-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua</option>
            <option value="requested">Diajukan</option>
            <option value="approved">Disetujui</option>
            <option value="processing">Diproses</option>
            <option value="completed">Selesai</option>
            <option value="rejected">Ditolak</option>
            <option value="failed">Gagal</option>
          </NativeSelect>
        </label>
      </div>

      <QueryState
        error={refunds.error}
        isEmpty={(refunds.data?.data.length ?? 0) === 0}
        emptyMessage="Tidak ada pengajuan refund."
        isLoading={refunds.isLoading}
        onRetry={() => void refunds.refetch()}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Kode</th>
                <th scope="col">Nilai</th>
                <th scope="col">Kanal</th>
                <th scope="col">Alasan</th>
                <th scope="col">Status</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(refunds.data?.data ?? []).map((refund) => (
                <tr key={refund.id}>
                  <td>
                    {refund.refundCode}
                    <br />
                    <small>{formatDateTimeWita(refund.createdAt)}</small>
                  </td>
                  <td className="numeric">{formatRupiah(refund.amount)}</td>
                  <td>{labels.refundChannel(refund.channel).label}</td>
                  <td>
                    {refund.reason}
                    {refund.failureReason ? (
                      <>
                        <br />
                        <small>Gagal: {refund.failureReason}</small>
                      </>
                    ) : null}
                  </td>
                  <td>
                    <StatusChip {...labels.refundStatus(refund.status)} />
                  </td>
                  <td>
                    <RefundActions isAdmin={isAdmin} refund={refund} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  )
}

function PaymentsPage(): ReactNode {
  const session = useAuthSession()
  const isAdmin = session.user?.role === 'admin'

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Operasional</p>
        <h1>Pembayaran &amp; refund</h1>
        <p>
          Kalau customer mengeluh &ldquo;sudah bayar tapi belum terkonfirmasi&rdquo;, cari
          pembayarannya di sini dan tekan <strong>Sinkronkan</strong> — status ditarik ulang
          langsung dari gateway tanpa menunggu webhook.
        </p>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Pembayaran</h2>
          </div>
        </div>
        <PaymentsPanel />
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Refund</h2>
            <p>
              {isAdmin
                ? 'Persetujuan dan penolakan tercatat di audit log atas nama akun Anda.'
                : 'Persetujuan dan penolakan refund hanya dapat dilakukan administrator.'}
            </p>
          </div>
        </div>
        <RefundsPanel isAdmin={isAdmin} />
      </div>
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin', 'staff']}>
      <PaymentsPage />
    </RoleRouteGuard>
  )
}
