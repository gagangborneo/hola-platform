'use client'

import { Button } from '@hola/ui'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { useAuthSession } from '../../lib/auth.ts'
import type { CourtSummary } from '../../lib/court-summary.ts'
import { formatDateWita, formatRupiah, formatTimeWita } from '../../lib/format.ts'
import { accountDisplayName, accountIdentity } from '../../lib/session-identity.ts'
import { bookingStatusLabel } from '../../lib/status-labels.ts'
import { rateClassLabel } from '../booking/availability-labels.ts'
import { BookingQr } from './BookingQr.tsx'

interface ReceiptProps {
  bookingId: string
  /** Dipicu tombol "Unduh invoice" lewat `?print=1`. */
  autoPrint?: boolean
  courts: Record<string, CourtSummary>
}

export function Receipt({ bookingId, autoPrint = false, courts }: ReceiptProps): ReactNode {
  // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa pun —
  // `$get` di bawah TIDAK PERNAH resolve dengan Response ber-`.ok === false`,
  // jadi kegagalan sudah ditangani lewat `receipt.isError` (react-query
  // menangkap promise yang reject), bukan `if (!response.ok)`.
  const session = useAuthSession()
  const identity = accountIdentity(session.user)

  const receipt = useQuery({
    queryKey: ['receipt', bookingId],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings[':id'].receipt.$get({
        param: { id: bookingId },
      })
      return response.json()
    },
  })

  // Dialog cetak hanya boleh muncul sekali dan hanya setelah isinya benar-benar
  // ada di layar — mencetak kerangka kosong menghasilkan invoice kosong.
  const hasPrinted = useRef(false)
  const isReady = receipt.isSuccess
  useEffect(() => {
    if (!autoPrint || !isReady || hasPrinted.current) return
    hasPrinted.current = true
    const timer = setTimeout(() => globalThis.print(), 300)
    return () => clearTimeout(timer)
  }, [autoPrint, isReady])

  if (receipt.isPending) return <p className="text-muted-foreground">Memuat e-receipt…</p>
  if (receipt.isError || !receipt.data) {
    return (
      <p className="rounded-xl bg-destructive/10 p-4 text-destructive">E-receipt belum tersedia.</p>
    )
  }

  const data = receipt.data.data
  const courtNames = [
    ...new Set(
      data.items.map((item) => {
        const court = courts[item.court_id]
        return court ? `${court.name} (${court.code})` : 'Lapangan Hola'
      }),
    ),
  ].join(', ')

  return (
    // Padding dipertahankan saat mencetak (hanya bingkainya yang hilang): tanpa
    // itu, invoice yang dicetak dengan margin "None" menempel ke tepi kertas.
    <article className="rounded-xl border bg-card p-8 print:border-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Hola Sports Center
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold">Bukti pemesanan</h1>
          <p className="mt-1 text-muted-foreground">{data.booking_code}</p>
        </div>
        <BookingQr
          bookingCode={data.booking_code}
          isActive={data.status === 'confirmed' || data.status === 'completed'}
          inactiveReason="QR aktif setelah pembayaran lunas"
        />
      </header>

      <dl className="mt-6 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Pemesan</dt>
          <dd className="text-right font-semibold">
            {accountDisplayName(session.user)}
            {identity ? (
              <span className="block font-normal text-muted-foreground">{identity}</span>
            ) : null}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Lapangan</dt>
          <dd className="text-right font-semibold">{courtNames}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Tanggal main</dt>
          <dd className="text-right font-semibold">
            {formatDateWita(`${data.booking_date}T00:00:00+08:00`)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="text-right font-semibold">{bookingStatusLabel(data.status)}</dd>
        </div>
      </dl>

      <ul className="mt-6 grid gap-2">
        {data.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 border-b pb-2 text-sm">
            <span>
              {formatTimeWita(item.starts_at)}–{formatTimeWita(item.ends_at)} ·{' '}
              {courts[item.court_id]?.code ?? 'Lapangan'} · {rateClassLabel(item.rate_class)}
            </span>
            <span className="font-semibold">{formatRupiah(item.line_total_amount)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-between border-t pt-4">
        <span className="font-display font-bold">Total dibayar</span>
        <span className="font-display text-xl font-bold text-primary">
          {formatRupiah(data.total_amount)}
        </span>
      </div>

      <Button className="mt-8 print:hidden" onClick={() => globalThis.print()}>
        <Download className="size-4" aria-hidden />
        Unduh / cetak PDF
      </Button>
      <p className="mt-2 text-xs text-muted-foreground print:hidden">
        Pilih "Simpan sebagai PDF" pada jendela cetak untuk mengunduh invoice ini.
      </p>
    </article>
  )
}
