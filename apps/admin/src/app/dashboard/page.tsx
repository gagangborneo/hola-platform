'use client'

import { witaToInstant } from '@hola/shared'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { QueryState } from '../../components/common/QueryState.tsx'
import { StatusChip } from '../../components/common/StatusChip.tsx'
import { apiClient } from '../../lib/api-client.ts'
import { parseOffsetList } from '../../lib/api-response.ts'
import { useAuthSession } from '../../lib/auth.ts'
import {
  type Booking,
  bookingPartyLabel,
  isBookingResponse,
  normalizeBooking,
} from '../../lib/bookings.ts'
import { type Court, courtsById, useCourts } from '../../lib/courts.ts'
import {
  formatDateWita,
  formatRupiah,
  formatSlotRange,
  formatTimeWita,
  todayWita,
} from '../../lib/format.ts'
import * as labels from '../../lib/labels.ts'
import { isPaymentResponse, normalizePayment, type Payment } from '../../lib/payments.ts'
import { isSlotClaimResponse, normalizeSlotClaim, type SlotClaim } from '../../lib/slot-claims.ts'

/** Satu halaman penuh cukup untuk satu hari operasional di satu venue. */
const PAGE_SIZE = 100

interface DayBounds {
  dateKey: string
  endIso: string
  startIso: string
}

function dayBounds(dateKey: string): DayBounds {
  return {
    dateKey,
    startIso: witaToInstant(dateKey, 0).toISOString(),
    endIso: witaToInstant(dateKey, 1440).toISOString(),
  }
}

function useTodayBookings(day: DayBounds) {
  return useQuery({
    queryKey: ['dashboard-bookings', day.dateKey],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings.$get({
        query: {
          booking_date_from: day.dateKey,
          booking_date_to: day.dateKey,
          per_page: String(PAGE_SIZE),
          sort: 'booking_date',
        },
      })
      const list = parseOffsetList(await response.json(), isBookingResponse)
      return { ...list, data: list.data.map(normalizeBooking) }
    },
  })
}

function useTodayPayments(day: DayBounds) {
  return useQuery({
    queryKey: ['dashboard-payments', day.dateKey],
    queryFn: async () => {
      const response = await apiClient.api.v1.payments.$get({
        query: {
          status: 'paid',
          paid_at_from: day.startIso,
          paid_at_to: day.endIso,
          per_page: String(PAGE_SIZE),
        },
      })
      const list = parseOffsetList(await response.json(), isPaymentResponse)
      return { ...list, data: list.data.map(normalizePayment) }
    },
  })
}

/**
 * Hold tidak dibatasi ke hari ini: hold yang dibuat sore ini untuk besok tetap
 * mengunci slot dan tetap perlu terlihat operator.
 */
function useActiveHolds(day: DayBounds) {
  return useQuery({
    queryKey: ['dashboard-holds', day.dateKey],
    queryFn: async () => {
      const response = await apiClient.api.v1['slot-claims'].$get({
        query: {
          status: 'held',
          slot_date_from: day.dateKey,
          per_page: String(PAGE_SIZE),
        },
      })
      const list = parseOffsetList(await response.json(), isSlotClaimResponse)
      return { ...list, data: list.data.map(normalizeSlotClaim) }
    },
    refetchInterval: 60_000,
  })
}

function usePendingPaymentBookings() {
  return useQuery({
    queryKey: ['dashboard-pending-payment'],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings.$get({
        query: { status: 'pending_payment', per_page: '25', sort: '-created_at' },
      })
      const list = parseOffsetList(await response.json(), isBookingResponse)
      return { ...list, data: list.data.map(normalizeBooking) }
    },
    refetchInterval: 60_000,
  })
}

interface MetricProps {
  detail?: string
  href?: string
  isAlert?: boolean
  label: string
  value: string
}

function Metric({ detail, href, isAlert = false, label, value }: MetricProps): ReactNode {
  const className = isAlert ? 'metric-card metric-card-alert' : 'metric-card'
  const body = (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {detail ? <small>{detail}</small> : null}
    </>
  )
  if (href) {
    return (
      <Link className={className} href={href}>
        {body}
      </Link>
    )
  }
  return <div className={className}>{body}</div>
}

/**
 * Total uang masuk dijumlahkan dari baris yang benar-benar dimuat. Kalau hari
 * itu melebihi satu halaman, angkanya ditandai sebagai batas bawah alih-alih
 * dilaporkan seolah lengkap.
 */
function paidSummary(payments: readonly Payment[], totalCount: number | null): MetricProps {
  const sum = payments.reduce((total, payment) => total + payment.amount, 0)
  const isPartial = totalCount !== null && totalCount > payments.length
  return {
    label: 'Pembayaran masuk hari ini',
    value: `${isPartial ? '≥ ' : ''}${formatRupiah(sum)}`,
    detail: isPartial
      ? `${totalCount} transaksi — nominal dari ${payments.length} terbaru`
      : `${payments.length} transaksi lunas`,
  }
}

function TodayScheduleByCourt({
  bookings,
  courts,
}: {
  bookings: readonly Booking[]
  courts: readonly Court[]
}): ReactNode {
  // Booking hari ini dikelompokkan lewat slot-claim-nya di kalender; di sini
  // pengelompokan cukup memakai kolom yang ada di daftar booking.
  const active = bookings.filter(
    (booking) => booking.status !== 'cancelled' && booking.status !== 'expired',
  )
  if (active.length === 0) {
    return <p className="table-state">Belum ada booking aktif untuk hari ini.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Kode</th>
            <th scope="col">Pemesan</th>
            <th scope="col">Slot</th>
            <th scope="col">Kanal</th>
            <th scope="col">Status</th>
            <th scope="col">Nilai</th>
          </tr>
        </thead>
        <tbody>
          {active.map((booking) => {
            const status = labels.bookingStatus(booking.status)
            const channel = labels.bookingChannel(booking.channel)
            return (
              <tr key={booking.id}>
                <td>
                  <Link href={`/dashboard/bookings/${booking.id}`}>{booking.bookingCode}</Link>
                </td>
                <td>{bookingPartyLabel(booking)}</td>
                <td>{booking.slotCount} slot</td>
                <td>{channel.label}</td>
                <td>
                  <StatusChip label={status.label} tone={status.tone} />
                  {booking.checkedInAt ? (
                    <>
                      {' '}
                      <StatusChip label="Sudah check-in" tone="positive" />
                    </>
                  ) : null}
                </td>
                <td className="numeric">{formatRupiah(booking.totalAmount)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="table-state">
        {courts.length} lapangan terdaftar. Buka <Link href="/dashboard/schedule">jadwal slot</Link>{' '}
        untuk melihat sebaran per lapangan.
      </p>
    </div>
  )
}

function HoldList({
  claims,
  courts,
}: {
  claims: readonly SlotClaim[]
  courts: Map<string, Court>
}) {
  if (claims.length === 0) return <p className="table-state">Tidak ada hold aktif.</p>
  return (
    <ul className="stack-tight">
      {claims.slice(0, 8).map((claim) => (
        <li key={claim.id}>
          <strong>{courts.get(claim.courtId)?.name ?? 'Lapangan tidak dikenal'}</strong> ·{' '}
          {formatSlotRange(claim.startsAt, claim.endsAt)} ·{' '}
          {claim.holdExpiresAt
            ? `hold habis ${formatTimeWita(claim.holdExpiresAt)}`
            : 'tanpa batas hold'}
        </li>
      ))}
    </ul>
  )
}

function PendingPaymentList({ bookings }: { bookings: readonly Booking[] }): ReactNode {
  if (bookings.length === 0) {
    return <p className="table-state">Tidak ada booking yang menunggu pembayaran.</p>
  }
  return (
    <ul className="stack-tight">
      {bookings.map((booking) => (
        <li key={booking.id}>
          <Link href={`/dashboard/bookings/${booking.id}`}>{booking.bookingCode}</Link> ·{' '}
          {bookingPartyLabel(booking)} · {formatRupiah(booking.totalAmount)}
          {booking.holdExpiresAt ? ` · hold habis ${formatTimeWita(booking.holdExpiresAt)}` : ''}
        </li>
      ))}
    </ul>
  )
}

function OperationsDashboard(): ReactNode {
  // Diambil sekali per mount: dashboard tidak boleh berpindah hari di tengah
  // sesi hanya karena sebuah komponen kebetulan render ulang lewat tengah malam.
  const [day] = useState(() => dayBounds(todayWita(new Date())))
  const courtsQuery = useCourts()
  const bookingsQuery = useTodayBookings(day)
  const paymentsQuery = useTodayPayments(day)
  const holdsQuery = useActiveHolds(day)
  const pendingQuery = usePendingPaymentBookings()

  const courts = courtsQuery.data ?? []
  const summary = paidSummary(
    paymentsQuery.data?.data ?? [],
    paymentsQuery.data?.pagination.totalCount ?? null,
  )

  return (
    <section className="page-stack">
      <div className="page-heading-row">
        <div className="page-heading">
          <p className="eyebrow">Operasional</p>
          <h1>Hari ini</h1>
          <p>{formatDateWita(day.startIso)} · waktu WITA</p>
        </div>
        <div className="row">
          <Link className="button-link" href="/dashboard/bookings/new">
            Booking manual
          </Link>
          <Link className="button-link button-secondary" href="/dashboard/schedule">
            Jadwal slot
          </Link>
        </div>
      </div>

      <dl className="metric-grid">
        <Metric
          label="Booking hari ini"
          value={String(bookingsQuery.data?.pagination.totalCount ?? '—')}
          detail="Seluruh status"
          href={`/dashboard/bookings?date=${day.dateKey}`}
        />
        <Metric {...summary} href="/dashboard/payments" />
        <Metric
          label="Hold aktif"
          value={String(holdsQuery.data?.pagination.totalCount ?? '—')}
          detail="Slot terkunci menunggu pembayaran"
        />
        <Metric
          label="Perlu ditindaklanjuti"
          value={String(pendingQuery.data?.pagination.totalCount ?? '—')}
          detail="Booking berstatus menunggu pembayaran"
          isAlert={(pendingQuery.data?.pagination.totalCount ?? 0) > 0}
          href="/dashboard/bookings?status=pending_payment"
        />
      </dl>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Booking hari ini</h2>
            <p>Booking yang dibatalkan dan kedaluwarsa disembunyikan.</p>
          </div>
        </div>
        <QueryState
          error={bookingsQuery.error}
          isLoading={bookingsQuery.isLoading || courtsQuery.isLoading}
          onRetry={() => void bookingsQuery.refetch()}
        >
          <TodayScheduleByCourt bookings={bookingsQuery.data?.data ?? []} courts={courts} />
        </QueryState>
      </div>

      <div className="metric-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Hold aktif</h2>
              <p>Slot yang terkunci sementara dan akan lepas sendiri saat hold habis.</p>
            </div>
          </div>
          <QueryState
            error={holdsQuery.error}
            isLoading={holdsQuery.isLoading}
            onRetry={() => void holdsQuery.refetch()}
          >
            <HoldList claims={holdsQuery.data?.data ?? []} courts={courtsById(courts)} />
          </QueryState>
        </div>

        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Menunggu pembayaran</h2>
              <p>
                Kalau customer mengaku sudah membayar, buka detailnya dan jalankan sinkronisasi
                pembayaran.
              </p>
            </div>
          </div>
          <QueryState
            error={pendingQuery.error}
            isLoading={pendingQuery.isLoading}
            onRetry={() => void pendingQuery.refetch()}
          >
            <PendingPaymentList bookings={pendingQuery.data?.data ?? []} />
          </QueryState>
        </div>
      </div>
    </section>
  )
}

function TenantDashboard(): ReactNode {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Tenant</p>
        <h1>Portal tenant</h1>
        <p>Kontrak, tagihan, dan bukti pembayaran tenant dikelola dari portal ini.</p>
      </div>
      <div className="dashboard-cards">
        <Link className="dashboard-card" href="/dashboard/contracts">
          Buka kontrak &amp; tagihan
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

export default function DashboardPage(): ReactNode {
  const session = useAuthSession()
  if (!session.user) return null
  if (session.user.role === 'tenant') return <TenantDashboard />
  return <OperationsDashboard />
}
