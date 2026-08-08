'use client'

import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatDateWita, formatRupiah, formatTimeWita } from '../../lib/format.ts'
import { Button } from '../ui/button.tsx'

interface ReceiptProps {
  bookingId: string
}

export function Receipt({ bookingId }: ReceiptProps): ReactNode {
  // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa pun —
  // `$get` di bawah TIDAK PERNAH resolve dengan Response ber-`.ok === false`,
  // jadi kegagalan sudah ditangani lewat `receipt.isError` (react-query
  // menangkap promise yang reject), bukan `if (!response.ok)`.
  const receipt = useQuery({
    queryKey: ['receipt', bookingId],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings[':id'].receipt.$get({
        param: { id: bookingId },
      })
      return response.json()
    },
  })

  if (receipt.isPending) return <p className="text-muted-foreground">Memuat e-receipt…</p>
  if (receipt.isError || !receipt.data) {
    return (
      <p className="rounded-xl bg-destructive/10 p-4 text-destructive">E-receipt belum tersedia.</p>
    )
  }

  const data = receipt.data.data

  return (
    <article className="rounded-xl border bg-card p-8 print:border-0 print:p-0">
      <header className="border-b pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Hola Sports Center
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">Bukti pemesanan</h1>
        <p className="mt-1 text-muted-foreground">{data.booking_code}</p>
      </header>

      <dl className="mt-6 grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tanggal main</dt>
          <dd className="font-semibold">{formatDateWita(`${data.booking_date}T00:00:00+08:00`)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-semibold">{data.status}</dd>
        </div>
      </dl>

      <ul className="mt-6 grid gap-2">
        {data.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b pb-2 text-sm">
            <span>
              {formatTimeWita(item.starts_at)}–{formatTimeWita(item.ends_at)} · {item.rate_class}
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
        Cetak
      </Button>
    </article>
  )
}
