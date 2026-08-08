'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatDateWita, formatRupiah, formatTimeWita } from '../../lib/format.ts'
import { bookingStatusLabel } from '../../lib/status-labels.ts'
import { rateClassLabel } from '../booking/availability-labels.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { CancelDialog } from './CancelDialog.tsx'

interface BookingDetailProps {
  bookingId: string
  cancellationPolicyText: string | null
}

export function BookingDetail({
  bookingId,
  cancellationPolicyText,
}: BookingDetailProps): ReactNode {
  const queryClient = useQueryClient()

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

  const onCancelled = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })
    void queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
  }, [queryClient, bookingId])

  if (booking.isPending) return <p className="text-muted-foreground">Memuat…</p>
  if (booking.isError || !booking.data) {
    return (
      <p className="rounded-xl bg-destructive/10 p-4 text-destructive">Booking tidak ditemukan.</p>
    )
  }

  const data = booking.data.data

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{data.booking_code}</h1>
          <p className="mt-1 text-muted-foreground">
            {formatDateWita(`${data.booking_date}T00:00:00+08:00`)}
          </p>
        </div>
        <Badge variant={data.status === 'confirmed' ? 'default' : 'secondary'}>
          {bookingStatusLabel(data.status)}
        </Badge>
      </div>

      <ul className="mt-8 grid gap-2">
        {data.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b pb-2">
            <span>
              {formatTimeWita(item.starts_at)}–{formatTimeWita(item.ends_at)} ·{' '}
              {rateClassLabel(item.rate_class)}
            </span>
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

      <div className="mt-8 flex flex-wrap gap-3">
        {data.status === 'pending_payment' && data.hold_expires_at ? (
          <Button asChild variant="accent">
            <Link href={`/booking/${data.id}`}>Lanjutkan pembayaran</Link>
          </Button>
        ) : null}
        {data.status === 'confirmed' || data.status === 'completed' ? (
          <Button asChild variant="outline">
            <Link href={`/akun/booking/${data.id}/receipt`}>Lihat e-receipt</Link>
          </Button>
        ) : null}
        {data.is_cancellable ? (
          <CancelDialog
            bookingId={data.id}
            refundEstimateAmount={data.refund_estimate_amount}
            policyApplied={data.policy_applied}
            cancellationPolicyText={cancellationPolicyText}
            onCancelled={onCancelled}
          />
        ) : null}
      </div>
    </div>
  )
}
