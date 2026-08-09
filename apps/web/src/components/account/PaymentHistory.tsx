'use client'

import { Badge, Button, Card, cn, Skeleton } from '@hola/ui'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronRight, Clock3, FileText } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatDateWita, formatRupiah, formatTimeWita } from '../../lib/format.ts'
import { bookingStatusLabel } from '../../lib/status-labels.ts'
import { EmptyState } from '../common/EmptyState.tsx'

const TABS = [
  { label: 'Semua transaksi', value: 'all' },
  { label: 'Belum dibayar', value: 'unpaid' },
] as const

type Tab = (typeof TABS)[number]['value']

function BillSkeleton(): ReactNode {
  return (
    <Card className="grid gap-3 p-4 sm:p-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56" />
      <Skeleton className="h-9 w-32 rounded-xl" />
    </Card>
  )
}

/**
 * Riwayat tagihan pelanggan.
 *
 * Sumbernya `GET /me/bookings`, BUKAN `GET /payments`: daftar pembayaran
 * dibatasi `requireRole([STAFF, ADMIN])` (payments.routes.ts) dan akan menolak
 * customer dengan 403. Satu booking = satu tagihan, jadi baris di sini memakai
 * status booking apa adanya lewat `bookingStatusLabel` — status pembayaran
 * tidak pernah dikarang ulang dari status booking.
 *
 * `upcoming: 'false'` bukan berarti "hanya yang lampau": tanpa filter tanggal
 * repository mengembalikan SELURUH booking terurut dari yang terbaru
 * (`listCustomerBookings`), yang persis dibutuhkan riwayat pembayaran.
 */
export function PaymentHistory(): ReactNode {
  const [tab, setTab] = useState<Tab>('all')

  const bills = useInfiniteQuery({
    queryKey: ['my-bills', tab],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa
      // pun — `$get` di bawah TIDAK PERNAH resolve dengan Response ber-
      // `.ok === false`, jadi kegagalan ditangani lewat `bills.isError`.
      const response = await apiClient.api.v1.me.bookings.$get({
        query: {
          upcoming: 'false',
          ...(tab === 'unpaid' ? { status: 'pending_payment' as const } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      })
      return response.json()
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.meta?.pagination
      return pagination?.mode === 'cursor' ? (pagination.next_cursor ?? undefined) : undefined
    },
  })

  const rows = (bills.data?.pages ?? []).flatMap((page) => page.data)

  return (
    <section className="grid gap-4">
      <div
        className="inline-flex self-start rounded-xl bg-secondary p-1"
        role="tablist"
        aria-label="Filter tagihan"
      >
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
              tab === item.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-secondary-foreground hover:text-primary',
            )}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {bills.isPending ? (
        <div className="grid gap-3">
          <BillSkeleton />
          <BillSkeleton />
        </div>
      ) : null}

      {bills.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="font-semibold text-foreground">Riwayat pembayaran gagal dimuat.</p>
          <p className="mt-1 text-muted-foreground">Periksa koneksi lalu coba lagi.</p>
          <Button className="mt-4" variant="outline" onClick={() => void bills.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!bills.isPending && !bills.isError && rows.length === 0 ? (
        <EmptyState
          title={tab === 'unpaid' ? 'Tidak ada tagihan tertunggak' : 'Belum ada transaksi'}
          description={
            tab === 'unpaid'
              ? 'Semua pesananmu sudah beres. Tagihan yang menunggu pembayaran akan muncul di sini.'
              : 'Setiap pemesanan lapangan tercatat di sini lengkap dengan nominal dan buktinya.'
          }
          actionHref="/lapangan"
          actionLabel="Pesan lapangan"
        />
      ) : null}

      <ul className="grid gap-3">
        {rows.map((booking) => {
          const isPending = booking.status === 'pending_payment'
          const hasReceipt = booking.status === 'confirmed' || booking.status === 'completed'

          return (
            <li key={booking.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-foreground">
                      {booking.booking_code}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Dipesan {formatDateWita(booking.created_at)} · main{' '}
                      {formatDateWita(`${booking.booking_date}T00:00:00+08:00`)}
                    </p>
                  </div>
                  {/* Tagihan yang belum dibayar punya tenggat, sisanya tidak —
                      hanya itu yang perlu menonjol di daftar sepanjang ini. */}
                  <Badge className="shrink-0" variant={isPending ? 'accent' : 'outline'}>
                    {bookingStatusLabel(booking.status)}
                  </Badge>
                </div>

                {isPending && booking.hold_expires_at ? (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-destructive">
                    <Clock3 className="size-4 shrink-0" aria-hidden />
                    Bayar sebelum {formatTimeWita(booking.hold_expires_at)} WITA
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    Total{' '}
                    <span className="font-display text-lg font-bold text-primary">
                      {formatRupiah(booking.total_amount)}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2 sm:ml-auto">
                    {isPending && booking.hold_expires_at ? (
                      <Button asChild size="sm" variant="accent">
                        <Link href={`/booking/${booking.id}`}>Bayar sekarang</Link>
                      </Button>
                    ) : null}
                    {hasReceipt ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/akun/booking/${booking.id}/receipt`}>
                          <FileText className="size-4" aria-hidden />
                          E-receipt
                        </Link>
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/akun/booking/${booking.id}`}>
                        Detail booking
                        <ChevronRight className="size-4" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      {bills.hasNextPage ? (
        <Button
          className="justify-self-center"
          variant="outline"
          disabled={bills.isFetchingNextPage}
          onClick={() => void bills.fetchNextPage()}
        >
          {bills.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      ) : null}
    </section>
  )
}
