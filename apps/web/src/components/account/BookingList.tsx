'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronRight, Clock3, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { cn } from '../../lib/cn.ts'
import {
  formatDateWita,
  formatDayNumberWita,
  formatMonthShortWita,
  formatRupiah,
  formatTimeWita,
} from '../../lib/format.ts'
import { bookingStatusLabel } from '../../lib/status-labels.ts'
import { EmptyState } from '../common/EmptyState.tsx'
import { Badge, type BadgeProps } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { Skeleton } from '../ui/skeleton.tsx'

/** Menunggu pembayaran perlu menonjol karena ada tenggat; sisanya cukup netral. */
function statusVariant(status: string): BadgeProps['variant'] {
  if (status === 'confirmed' || status === 'completed') return 'default'
  if (status === 'pending_payment') return 'accent'
  return 'outline'
}

function BookingCardSkeleton(): ReactNode {
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <Skeleton className="size-14 shrink-0 rounded-xl" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="hidden h-9 w-24 rounded-xl sm:block" />
    </Card>
  )
}

export function BookingList(): ReactNode {
  const [upcoming, setUpcoming] = useState(true)
  const searchParams = useSearchParams()
  const highlightPending = searchParams.get('pending') === '1'

  const bookings = useInfiniteQuery({
    queryKey: ['my-bookings', upcoming],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      // `myBookingsQuerySchema` menerima `upcoming` sebagai string 'true'/'false'.
      // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa
      // pun — `$get` di atas TIDAK PERNAH resolve dengan Response ber-
      // `.ok === false`, jadi kegagalan sudah ditangani lewat `bookings.isError`
      // (react-query menangkap promise yang reject), bukan `if (!response.ok)`.
      const response = await apiClient.api.v1.me.bookings.$get({
        query: {
          upcoming: upcoming ? 'true' : 'false',
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

  const rows = (bookings.data?.pages ?? []).flatMap((page) => page.data)
  const pendingCount = rows.filter((booking) => booking.status === 'pending_payment').length

  return (
    <section className="grid gap-4">
      {highlightPending ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <p className="leading-relaxed text-foreground">
            Kamu sudah punya 3 booking yang belum dibayar. Selesaikan atau batalkan salah satunya
            sebelum memesan lagi.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-xl bg-secondary p-1"
          role="tablist"
          aria-label="Filter booking"
        >
          {[
            { label: 'Mendatang', value: true },
            { label: 'Riwayat', value: false },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={upcoming === tab.value}
              className={cn(
                'rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors',
                upcoming === tab.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-secondary-foreground hover:text-primary',
              )}
              onClick={() => setUpcoming(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {pendingCount > 0 ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
            <Clock3 className="size-4" aria-hidden />
            {pendingCount} menunggu pembayaran
          </p>
        ) : null}
      </div>

      {bookings.isPending ? (
        <div className="grid gap-3">
          <BookingCardSkeleton />
          <BookingCardSkeleton />
        </div>
      ) : null}

      {bookings.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="font-semibold text-foreground">Daftar booking gagal dimuat.</p>
          <p className="mt-1 text-muted-foreground">Periksa koneksi lalu coba lagi.</p>
          <Button className="mt-4" variant="outline" onClick={() => void bookings.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!bookings.isPending && !bookings.isError && rows.length === 0 ? (
        <EmptyState
          title={upcoming ? 'Belum ada jadwal mendatang' : 'Belum ada riwayat main'}
          description={
            upcoming
              ? 'Pesan lapangan sekarang dan jadwal mainmu akan muncul di halaman ini.'
              : 'Booking yang sudah selesai atau dibatalkan akan tersimpan di sini.'
          }
          actionHref="/lapangan"
          actionLabel="Lihat lapangan"
        />
      ) : null}

      <div className="grid gap-3">
        {rows.map((booking) => {
          const bookingDate = `${booking.booking_date}T00:00:00+08:00`
          const isPending = booking.status === 'pending_payment'

          return (
            <Card key={booking.id} className="p-4 transition-shadow hover:shadow-md sm:p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div
                  className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
                  aria-hidden
                >
                  <span className="font-display text-xl font-bold leading-none">
                    {formatDayNumberWita(bookingDate)}
                  </span>
                  <span className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-wide">
                    {formatMonthShortWita(bookingDate)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-bold text-foreground">
                      {booking.booking_code}
                    </p>
                    <Badge variant={statusVariant(booking.status)}>
                      {bookingStatusLabel(booking.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateWita(bookingDate)} · {booking.slot_count} slot
                  </p>
                  {isPending && booking.hold_expires_at ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-destructive">
                      <Clock3 className="size-4 shrink-0" aria-hidden />
                      Bayar sebelum {formatTimeWita(booking.hold_expires_at)} WITA
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Total ikut baris aksi, bukan baris kode booking: di ponsel dua
                  angka berdampingan memaksa lencana status pecah dua baris. */}
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
                      <Link href={`/booking/${booking.id}`}>Lanjutkan pembayaran</Link>
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/akun/booking/${booking.id}`}>
                      Detail booking
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {bookings.hasNextPage ? (
        <Button
          className="justify-self-center"
          variant="outline"
          disabled={bookings.isFetchingNextPage}
          onClick={() => void bookings.fetchNextPage()}
        >
          {bookings.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      ) : null}
    </section>
  )
}
