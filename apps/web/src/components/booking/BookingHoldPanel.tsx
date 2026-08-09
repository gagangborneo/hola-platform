'use client'

import { Button } from '@hola/ui'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatRupiah, formatTimeWita } from '../../lib/format.ts'
import { serverTimeOffsetMs } from '../../lib/server-time.ts'
import { HoldCountdown } from './HoldCountdown.tsx'
import { PayButton } from './PayButton.tsx'

interface BookingHoldPanelProps {
  bookingId: string
  serverTime: string
  midtransClientKey: string
}

export function BookingHoldPanel({
  bookingId,
  serverTime,
  midtransClientKey,
}: BookingHoldPanelProps): ReactNode {
  const [expired, setExpired] = useState(false)
  const [offsetMs] = useState(() => serverTimeOffsetMs(serverTime, Date.now()))
  const onExpired = useCallback(() => setExpired(true), [])

  // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa pun —
  // `$get` di bawah TIDAK PERNAH resolve dengan Response ber-`.ok === false`,
  // jadi kegagalan sudah ditangani lewat `booking.isError` (react-query
  // menangkap promise yang reject), bukan `if (!response.ok)`.
  const booking = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings[':id'].$get({ param: { id: bookingId } })
      return response.json()
    },
  })

  if (booking.isPending) return <p className="text-muted-foreground">Memuat booking…</p>
  if (booking.isError || !booking.data) {
    return (
      <p className="rounded-xl bg-destructive/10 p-4 text-destructive">Booking tidak ditemukan.</p>
    )
  }

  const data = booking.data.data

  if (expired || (data.status === 'expired' && data.hold_expires_at === null)) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Waktu mengunci slot habis</h1>
        <p className="mt-3 text-muted-foreground">
          Slot dilepas kembali agar bisa dipesan orang lain. Silakan pilih slot lagi.
        </p>
        <Button asChild className="mt-6">
          <Link href="/lapangan">Pilih slot lagi</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-8">
      <h1 className="font-display text-3xl font-bold">Selesaikan pembayaran</h1>
      <p className="mt-2 text-muted-foreground">Kode booking {data.booking_code}</p>

      {data.hold_expires_at ? (
        <div className="mt-6 flex items-center gap-4 rounded-xl bg-secondary p-4">
          <HoldCountdown
            holdExpiresAt={data.hold_expires_at}
            offsetMs={offsetMs}
            onExpired={onExpired}
          />
          <p className="text-sm text-secondary-foreground">
            Slot dikunci sampai waktu ini habis. Selesaikan pembayaran sebelum itu.
          </p>
        </div>
      ) : null}

      <ul className="mt-6 grid gap-2">
        {data.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b pb-2">
            <span>{formatTimeWita(item.starts_at)}</span>
            <span className="font-semibold">{formatRupiah(item.line_total_amount)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-display font-bold">Total</span>
        <span className="font-display text-2xl font-bold text-primary">
          {formatRupiah(data.total_amount)}
        </span>
      </div>

      <PayButton bookingId={bookingId} midtransClientKey={midtransClientKey} />
    </div>
  )
}
