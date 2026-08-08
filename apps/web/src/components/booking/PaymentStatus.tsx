'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { paymentStatusLabel } from '../../lib/status-labels.ts'
import { Button } from '../ui/button.tsx'

const POLL_INTERVAL_MS = 3_000
const POLL_LIMIT_MS = 5 * 60_000
const FINAL_STATUSES = new Set(['paid', 'failed', 'expired', 'cancelled', 'refunded'])

interface PaymentStatusProps {
  paymentId: string
  bookingId: string
}

export function PaymentStatus({ paymentId, bookingId }: PaymentStatusProps): ReactNode {
  const [pollingStoppedAt, setPollingStoppedAt] = useState<number | null>(null)

  const payment = useQuery({
    queryKey: ['payment', paymentId],
    refetchInterval: (query) => {
      const status = query.state.data?.data.status
      if (status && FINAL_STATUSES.has(status)) return false
      if (pollingStoppedAt !== null) return false
      return POLL_INTERVAL_MS
    },
    queryFn: async () => {
      const response = await apiClient.api.v1.payments[':id'].$get({ param: { id: paymentId } })
      // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa
      // pun — `$get` di atas TIDAK PERNAH resolve dengan Response ber-
      // `.ok === false`, jadi kegagalan ditangani lewat `payment.isError`.
      //
      // Sengaja `GET /payments/{id}`, BUKAN `POST /payments/{id}/sync`: sync
      // dibatasi `requireRole([STAFF, ADMIN])` (payments.routes.ts) dan akan
      // menolak customer dengan 403. Penyelarasan manual adalah tugas staff
      // lewat runbook P1-95.
      return response.json()
    },
  })

  // Berhenti setelah 5 menit; menunggu tanpa batas hanya membakar kuota dan
  // baterai kalau webhook Midtrans terlambat atau tidak pernah datang.
  useEffect(() => {
    const timer = setTimeout(() => setPollingStoppedAt(Date.now()), POLL_LIMIT_MS)
    return () => clearTimeout(timer)
  }, [])

  const status = payment.data?.data.status

  if (status === 'paid') {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h1 className="font-display text-3xl font-bold text-primary">Pembayaran berhasil</h1>
        <p className="mt-3 text-muted-foreground">Booking kamu sudah terkonfirmasi.</p>
        <Button asChild className="mt-6">
          <Link href={`/akun/booking/${bookingId}`}>Lihat detail & e-receipt</Link>
        </Button>
      </div>
    )
  }

  if (status && FINAL_STATUSES.has(status)) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Pembayaran tidak selesai</h1>
        <p className="mt-3 text-muted-foreground">
          Status terakhir: {paymentStatusLabel(status)}. Slot mungkin sudah dilepas.
        </p>
        <Button asChild className="mt-6">
          <Link href="/lapangan">Pilih slot lagi</Link>
        </Button>
      </div>
    )
  }

  if (pollingStoppedAt !== null) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Belum ada konfirmasi</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Kalau kamu sudah membayar, konfirmasi bisa terlambat masuk. Periksa lagi, atau hubungi
          staff sambil menyebut kode booking kamu.
        </p>
        <Button className="mt-6" onClick={() => void payment.refetch()}>
          Periksa lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <h1 className="font-display text-2xl font-bold">Menunggu pembayaran</h1>
      <p className="mt-3 text-muted-foreground">
        Halaman ini memperbarui sendiri setiap 3 detik. Jangan tutup dulu.
      </p>
    </div>
  )
}
