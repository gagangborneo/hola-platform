'use client'

import { useQuery } from '@tanstack/react-query'
import { Undo2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatDateWita, formatRupiah, formatTimeWita } from '../../lib/format.ts'
import { parseRefundList, refundChannelLabel } from '../../lib/refunds.ts'
import { refundPolicyLabel, refundStatusLabel } from '../../lib/status-labels.ts'
import { Badge, type BadgeProps } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { Skeleton } from '../ui/skeleton.tsx'

/** Cukup untuk seluruh riwayat refund satu pelanggan; batas per_page API 100. */
const PAGE_SIZE = '50'

const TONE_VARIANT: Record<string, BadgeProps['variant']> = {
  progress: 'accent',
  done: 'default',
  closed: 'outline',
}

interface RefundListProps {
  cancellationPolicyText: string | null
}

function timestampWita(iso: string): string {
  return `${formatDateWita(iso)} · ${formatTimeWita(iso)} WITA`
}

/**
 * Daftar pengajuan refund milik pelanggan (`GET /refunds`, otomatis ter-scope
 * ke pemiliknya oleh `getRefunds`).
 *
 * Tidak ada tombol "ajukan refund" di sini, dan itu disengaja: `POST /refunds`
 * dibatasi staff/admin. Refund pelanggan lahir otomatis saat booking yang sudah
 * dibayar dibatalkan (`cancelBooking`), lalu ditinjau manusia — jadi halaman ini
 * memantau, bukan mengajukan.
 */
export function RefundList({ cancellationPolicyText }: RefundListProps): ReactNode {
  const refunds = useQuery({
    queryKey: ['my-refunds'],
    queryFn: async () => {
      // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa
      // pun, jadi kegagalan ditangani lewat `refunds.isError`. `parseRefundList`
      // ikut melempar saat bentuk barisnya tak dikenali — serializer refund di
      // API mengembalikan `Record<string, unknown>` yang tidak bertipe.
      const response = await apiClient.api.v1.refunds.$get({ query: { per_page: PAGE_SIZE } })
      return parseRefundList(await response.json())
    },
  })

  const rows = refunds.data ?? []

  return (
    <section className="grid gap-4">
      <div className="flex items-start gap-3 rounded-xl bg-secondary/60 p-5">
        <Undo2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Bagaimana refund bekerja</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            Pengajuan refund dibuat otomatis saat kamu membatalkan booking yang sudah dibayar —
            nominalnya mengikuti kebijakan pembatalan venue. Setelah disetujui, dana dikirim dalam
            3–14 hari kerja.
          </p>
          {cancellationPolicyText?.trim() ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {cancellationPolicyText}
            </p>
          ) : null}
        </div>
      </div>

      {refunds.isPending ? <Skeleton className="h-32 rounded-xl" /> : null}

      {refunds.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="font-semibold text-foreground">Daftar refund gagal dimuat.</p>
          <p className="mt-1 text-muted-foreground">Periksa koneksi lalu coba lagi.</p>
          <Button className="mt-4" variant="outline" onClick={() => void refunds.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!refunds.isPending && !refunds.isError && rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="font-display text-lg font-bold text-foreground">
            Belum ada pengajuan refund
          </p>
          <p className="mx-auto mt-2 max-w-md leading-relaxed text-muted-foreground">
            Kalau nanti kamu membatalkan booking yang sudah dibayar, prosesnya akan terpantau di
            sini sampai dana diterima.
          </p>
        </div>
      ) : null}

      <ul className="grid gap-3">
        {rows.map((refund) => {
          const status = refundStatusLabel(refund.status)

          return (
            <li key={refund.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-foreground">
                      {refund.refundCode}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Diajukan {timestampWita(refund.createdAt)}
                    </p>
                  </div>
                  <Badge className="shrink-0" variant={TONE_VARIANT[status.tone] ?? 'outline'}>
                    {status.label}
                  </Badge>
                </div>

                <dl className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Nilai pengembalian
                    </dt>
                    <dd className="mt-0.5 font-display text-lg font-bold text-primary">
                      {formatRupiah(refund.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Dikirim lewat
                    </dt>
                    <dd className="mt-0.5 font-semibold text-foreground">
                      {refundChannelLabel(refund.channel)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Alasan pembatalan
                    </dt>
                    <dd className="mt-0.5 leading-relaxed text-foreground">{refund.reason}</dd>
                  </div>
                  {refund.policyApplied ? (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Kebijakan yang dipakai
                      </dt>
                      <dd className="mt-0.5 text-foreground">
                        {refundPolicyLabel(refund.policyApplied)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {refund.completedAt ? (
                  <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                    Dana dikirim {timestampWita(refund.completedAt)}.
                  </p>
                ) : refund.approvedAt ? (
                  <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
                    Disetujui {timestampWita(refund.approvedAt)} — dana sedang diproses.
                  </p>
                ) : null}

                {refund.failureReason ? (
                  <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive">
                    {refund.failureReason}
                  </p>
                ) : null}
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
