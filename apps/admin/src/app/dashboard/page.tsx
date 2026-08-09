'use client'

import { witaToInstant } from '@hola/shared'
import { buttonVariants } from '@hola/ui'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import type { DateRange } from '../../components/analytics/DateRangeFilter.tsx'
import { DateRangeFilter } from '../../components/analytics/DateRangeFilter.tsx'
import { KpiCard } from '../../components/analytics/KpiCard.tsx'
import { Panel } from '../../components/analytics/Panel.tsx'
import { BarList } from '../../components/charts/BarList.tsx'
import { LineChart } from '../../components/charts/LineChart.tsx'
import { SERIES_COLORS } from '../../components/charts/palette.ts'
import { QueryState } from '../../components/common/QueryState.tsx'
import { StatusChip } from '../../components/common/StatusChip.tsx'
import { formatCompactRupiah, formatNumber } from '../../lib/analytics/format.ts'
import {
  buildOperationsSummary,
  dateKeysBetween,
  MAX_RANGE_DAYS,
} from '../../lib/analytics/operations.ts'
import { apiClient } from '../../lib/api-client.ts'
import { fetchAllPages } from '../../lib/api-paging.ts'
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
import { isPaymentResponse, normalizePayment } from '../../lib/payments.ts'
import { isSlotClaimResponse, normalizeSlotClaim, type SlotClaim } from '../../lib/slot-claims.ts'

/** Batas kontrak API; halaman berikutnya diambil berurutan oleh `fetchAllPages`. */
const PAGE_SIZE = 100

function useRangeBookings(range: DateRange) {
  return useQuery({
    queryKey: ['ops-bookings', range.from, range.to],
    queryFn: () =>
      fetchAllPages(async (page) => {
        const response = await apiClient.api.v1.bookings.$get({
          query: {
            booking_date_from: range.from,
            booking_date_to: range.to,
            page: String(page),
            per_page: String(PAGE_SIZE),
            sort: 'booking_date',
          },
        })
        const list = parseOffsetList(await response.json(), isBookingResponse)
        return { ...list, data: list.data.map(normalizeBooking) }
      }),
  })
}

function useRangePayments(range: DateRange) {
  return useQuery({
    queryKey: ['ops-payments', range.from, range.to],
    queryFn: () =>
      fetchAllPages(async (page) => {
        const response = await apiClient.api.v1.payments.$get({
          query: {
            page: String(page),
            paid_at_from: witaToInstant(range.from, 0).toISOString(),
            paid_at_to: witaToInstant(range.to, 1440).toISOString(),
            per_page: String(PAGE_SIZE),
            status: 'paid',
          },
        })
        const list = parseOffsetList(await response.json(), isPaymentResponse)
        return { ...list, data: list.data.map(normalizePayment) }
      }),
  })
}

/**
 * Hold tidak dibatasi ke rentang: hold yang dibuat sore ini untuk pekan depan
 * tetap mengunci slot dan tetap perlu terlihat operator.
 */
function useActiveHolds(range: DateRange) {
  return useQuery({
    queryKey: ['ops-holds', range.from],
    queryFn: async () => {
      const response = await apiClient.api.v1['slot-claims'].$get({
        query: {
          per_page: String(PAGE_SIZE),
          slot_date_from: range.from,
          status: 'held',
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
    queryKey: ['ops-pending-payment'],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings.$get({
        query: { per_page: '25', sort: '-created_at', status: 'pending_payment' },
      })
      const list = parseOffsetList(await response.json(), isBookingResponse)
      return { ...list, data: list.data.map(normalizeBooking) }
    },
    refetchInterval: 60_000,
  })
}

function BookingTable({
  bookings,
  courts,
}: {
  bookings: readonly Booking[]
  courts: readonly Court[]
}): ReactNode {
  const active = bookings.filter(
    (booking) => booking.status !== 'cancelled' && booking.status !== 'expired',
  )
  if (active.length === 0) {
    return <p className="table-state">Belum ada booking aktif pada rentang ini.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Kode</th>
            <th scope="col">Tanggal</th>
            <th scope="col">Pemesan</th>
            <th scope="col">Slot</th>
            <th scope="col">Kanal</th>
            <th scope="col">Status</th>
            <th scope="col">Nilai</th>
          </tr>
        </thead>
        <tbody>
          {active.slice(0, 50).map((booking) => {
            const status = labels.bookingStatus(booking.status)
            const channel = labels.bookingChannel(booking.channel)
            return (
              <tr key={booking.id}>
                <td>
                  <Link href={`/dashboard/bookings/${booking.id}`}>{booking.bookingCode}</Link>
                </td>
                <td>{booking.bookingDate}</td>
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
        {active.length > 50 ? `50 dari ${active.length} booking aktif ditampilkan. ` : ''}
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
}): ReactNode {
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
  const [today] = useState(() => todayWita(new Date()))
  const [range, setRange] = useState<DateRange>(() => ({ from: today, to: today }))

  const courtsQuery = useCourts()
  const bookingsQuery = useRangeBookings(range)
  const paymentsQuery = useRangePayments(range)
  const holdsQuery = useActiveHolds(range)
  const pendingQuery = usePendingPaymentBookings()

  const dateKeys = useMemo(() => dateKeysBetween(range.from, range.to), [range.from, range.to])
  const summary = useMemo(
    () =>
      buildOperationsSummary(
        dateKeys,
        bookingsQuery.data?.items ?? [],
        paymentsQuery.data?.items ?? [],
      ),
    [dateKeys, bookingsQuery.data, paymentsQuery.data],
  )

  const courts = courtsQuery.data ?? []
  const isSingleDay = dateKeys.length < 2
  const isTruncated =
    bookingsQuery.data?.isTruncated === true || paymentsQuery.data?.isTruncated === true
  const isLoading = bookingsQuery.isLoading || paymentsQuery.isLoading
  const rangeLabel = isSingleDay
    ? formatDateWita(witaToInstant(range.from, 0).toISOString())
    : `${range.from} — ${range.to} · ${dateKeys.length} hari`

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div className="analytics-title">
          <p className="eyebrow">Operasional</p>
          <h1>{isSingleDay && range.from === today ? 'Hari ini' : 'Operasional'}</h1>
          <p className="muted">{rangeLabel} · waktu WITA</p>
        </div>
        <div className="analytics-filters">
          <Link className={buttonVariants()} href="/dashboard/bookings/new">
            Booking manual
          </Link>
          <Link className={buttonVariants({ variant: 'secondary' })} href="/dashboard/schedule">
            Jadwal slot
          </Link>
        </div>
      </header>

      <DateRangeFilter onChange={setRange} range={range} today={today} />

      {isTruncated ? (
        <p className="notice notice-warning">
          Rentang ini melebihi batas pengambilan data ({MAX_RANGE_DAYS * 20} baris). Angka dan
          grafik di bawah dihitung dari sebagian data saja — persempit rentangnya untuk hasil yang
          lengkap.
        </p>
      ) : null}

      <QueryState
        error={bookingsQuery.error ?? paymentsQuery.error}
        isLoading={isLoading}
        onRetry={() => {
          void bookingsQuery.refetch()
          void paymentsQuery.refetch()
        }}
      >
        <div className="kpi-grid">
          <KpiCard
            color={SERIES_COLORS.blue}
            delta={null}
            deltaCaption="pada rentang terpilih"
            label="Booking"
            trend={summary.buckets.map((bucket) => bucket.bookings)}
            value={formatNumber(summary.totals.bookings)}
          />
          <KpiCard
            color={SERIES_COLORS.aqua}
            delta={null}
            deltaCaption="terkonfirmasi & selesai"
            label="Booking lunas"
            trend={summary.buckets.map((bucket) => bucket.paidBookings)}
            value={formatNumber(summary.totals.paidBookings)}
          />
          <KpiCard
            color={SERIES_COLORS.orange}
            delta={null}
            deltaCaption="di luar batal & kedaluwarsa"
            label="Slot terpakai"
            trend={summary.buckets.map((bucket) => bucket.slots)}
            value={formatNumber(summary.totals.activeSlots)}
          />
          <KpiCard
            color={SERIES_COLORS.yellow}
            delta={null}
            deltaCaption="nilai booking lunas"
            label="Nilai booking"
            trend={summary.buckets.map((bucket) => bucket.revenue)}
            value={formatCompactRupiah(summary.totals.bookingValue)}
          />
          <KpiCard
            color={SERIES_COLORS.blue}
            delta={null}
            deltaCaption="pembayaran berstatus lunas"
            label="Uang masuk"
            trend={summary.buckets.map((bucket) => bucket.revenue)}
            value={formatCompactRupiah(summary.totals.revenue)}
          />
          <KpiCard
            color={SERIES_COLORS.orange}
            delta={null}
            deltaCaption="perlu ditindaklanjuti"
            isUpGood={false}
            label="Menunggu pembayaran"
            trend={summary.buckets.map((bucket) => bucket.bookings - bucket.paidBookings)}
            value={formatNumber(summary.totals.pending)}
          />
        </div>

        {isSingleDay ? (
          <p className="notice notice-info">
            Grafik tren muncul saat rentangnya lebih dari satu hari. Pilih “7 hari” atau “30 hari”
            di atas untuk melihat pergerakannya.
          </p>
        ) : (
          <div className="analytics-grid analytics-grid-split">
            <Panel
              subtitle={`Dikelompokkan pada tanggal main · ${dateKeys.length} hari`}
              title="Tren booking harian"
            >
              <LineChart
                description="Booking dibuat, booking lunas, dan slot terpakai per hari pada rentang terpilih"
                formatValue={formatNumber}
                height={220}
                labels={summary.labels}
                series={[
                  {
                    color: SERIES_COLORS.blue,
                    key: 'bookings',
                    label: 'Booking dibuat',
                    values: summary.buckets.map((bucket) => bucket.bookings),
                  },
                  {
                    color: SERIES_COLORS.orange,
                    key: 'paid',
                    label: 'Booking lunas',
                    values: summary.buckets.map((bucket) => bucket.paidBookings),
                  },
                  {
                    color: SERIES_COLORS.aqua,
                    key: 'slots',
                    label: 'Slot terpakai',
                    values: summary.buckets.map((bucket) => bucket.slots),
                  },
                ]}
                tickEvery={Math.max(1, Math.ceil(dateKeys.length / 12))}
              />
            </Panel>

            <Panel
              subtitle="Dikelompokkan pada tanggal pembayaran diterima"
              title="Uang masuk harian"
            >
              <LineChart
                description="Nilai pembayaran lunas per hari pada rentang terpilih"
                formatValue={formatCompactRupiah}
                height={220}
                labels={summary.labels}
                series={[
                  {
                    color: SERIES_COLORS.blue,
                    key: 'revenue',
                    label: 'Uang masuk',
                    showArea: true,
                    values: summary.buckets.map((bucket) => bucket.revenue),
                  },
                ]}
                tickEvery={Math.max(1, Math.ceil(dateKeys.length / 12))}
              />
            </Panel>
          </div>
        )}

        <div className="analytics-grid analytics-grid-3">
          <Panel subtitle="Seluruh booking pada rentang" title="Status booking">
            {summary.statuses.length === 0 ? (
              <p className="table-state">Belum ada booking pada rentang ini.</p>
            ) : (
              <BarList formatValue={formatNumber} items={[...summary.statuses]} />
            )}
          </Panel>

          <Panel subtitle="Booking lunas per kanal" title="Kanal pemesanan">
            {summary.channels.length === 0 ? (
              <p className="table-state">Belum ada booking lunas pada rentang ini.</p>
            ) : (
              <BarList formatValue={formatNumber} items={[...summary.channels]} />
            )}
          </Panel>

          <Panel subtitle="Nilai pembayaran lunas per metode" title="Metode pembayaran">
            {summary.methods.length === 0 ? (
              <p className="table-state">Belum ada pembayaran pada rentang ini.</p>
            ) : (
              <BarList formatValue={formatCompactRupiah} items={[...summary.methods]} />
            )}
          </Panel>
        </div>

        <Panel
          subtitle="Booking yang dibatalkan dan kedaluwarsa disembunyikan."
          title="Daftar booking"
        >
          <BookingTable bookings={bookingsQuery.data?.items ?? []} courts={courts} />
        </Panel>
      </QueryState>

      <div className="analytics-grid analytics-grid-2">
        <Panel
          subtitle="Slot yang terkunci sementara dan akan lepas sendiri saat hold habis."
          title="Hold aktif"
        >
          <QueryState
            error={holdsQuery.error}
            isLoading={holdsQuery.isLoading}
            onRetry={() => void holdsQuery.refetch()}
          >
            <HoldList claims={holdsQuery.data?.data ?? []} courts={courtsById(courts)} />
          </QueryState>
        </Panel>

        <Panel
          subtitle="Kalau customer mengaku sudah membayar, buka detailnya dan jalankan sinkronisasi pembayaran."
          title="Menunggu pembayaran"
        >
          <QueryState
            error={pendingQuery.error}
            isLoading={pendingQuery.isLoading}
            onRetry={() => void pendingQuery.refetch()}
          >
            <PendingPaymentList bookings={pendingQuery.data?.data ?? []} />
          </QueryState>
        </Panel>
      </div>
    </div>
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
