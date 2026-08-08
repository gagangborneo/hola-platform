'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatDateWita, formatRupiah } from '../../lib/format.ts'
import { bookingStatusLabel } from '../../lib/status-labels.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { Card, CardContent } from '../ui/card.tsx'

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

  return (
    <div>
      {highlightPending ? (
        <p className="mb-6 rounded-xl bg-secondary p-4 text-secondary-foreground">
          Kamu sudah punya 3 booking yang belum dibayar. Selesaikan atau batalkan salah satunya
          sebelum memesan lagi.
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={upcoming ? 'default' : 'outline'}
          onClick={() => setUpcoming(true)}
        >
          Mendatang
        </Button>
        <Button
          size="sm"
          variant={upcoming ? 'outline' : 'default'}
          onClick={() => setUpcoming(false)}
        >
          Riwayat
        </Button>
      </div>

      {bookings.isPending ? <p className="mt-6 text-muted-foreground">Memuat…</p> : null}

      {!bookings.isPending && rows.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-card p-10 text-center">
          <p className="font-display text-xl font-bold">Belum ada booking di sini</p>
          <p className="mt-2 text-muted-foreground">
            Pesan lapangan dan booking kamu akan muncul di halaman ini.
          </p>
          <Button asChild className="mt-6">
            <Link href="/lapangan">Lihat lapangan</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {rows.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <p className="font-display text-lg font-bold">{booking.booking_code}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateWita(`${booking.booking_date}T00:00:00+08:00`)} · {booking.slot_count}{' '}
                  slot
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {bookingStatusLabel(booking.status)}
                </Badge>
                <span className="font-semibold">{formatRupiah(booking.total_amount)}</span>
              </div>
              <div className="flex gap-2">
                {booking.status === 'pending_payment' && booking.hold_expires_at ? (
                  <Button asChild size="sm" variant="accent">
                    <Link href={`/booking/${booking.id}`}>Lanjutkan pembayaran</Link>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/akun/booking/${booking.id}`}>Detail</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bookings.hasNextPage ? (
        <Button
          className="mt-6"
          variant="outline"
          disabled={bookings.isFetchingNextPage}
          onClick={() => void bookings.fetchNextPage()}
        >
          {bookings.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      ) : null}
    </div>
  )
}
