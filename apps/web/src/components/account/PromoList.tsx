'use client'

import { Badge, Button, Card, Skeleton } from '@hola/ui'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Sparkles, TicketPercent } from 'lucide-react'
import type { ReactNode } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatDateWita, formatRupiah } from '../../lib/format.ts'
import { EmptyState } from '../common/EmptyState.tsx'
import { promoAppliesToLabel, promoQuotaLabel, promoValueLabel } from './promo-labels.ts'

function PromoSkeleton(): ReactNode {
  return (
    <Card className="grid gap-3 p-5">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-3 w-full max-w-sm" />
      <Skeleton className="h-3 w-32" />
    </Card>
  )
}

/**
 * Promo yang sedang berjalan untuk akun ini (`GET /promos/available`).
 *
 * Endpoint itu hanya mengembalikan promo `is_auto` — dan promo otomatis TIDAK
 * punya kode (`promos.schema.ts` mewajibkan `code` NULL persis untuk
 * `is_auto`). Karena itu kartu di sini tidak pernah menampilkan kode untuk
 * disalin: promo ini terpasang sendiri saat harga dihitung di checkout, dan
 * mengarang kotak "salin kode" hanya akan membuat customer mencari kode yang
 * tidak ada. Voucher berkode tetap dimasukkan manual di halaman checkout.
 */
export function PromoList(): ReactNode {
  const promos = useQuery({
    queryKey: ['available-promos'],
    queryFn: async () => {
      // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa
      // pun, jadi kegagalan ditangani lewat `promos.isError`.
      const response = await apiClient.api.v1.promos.available.$get()
      return response.json()
    },
  })

  const rows = promos.data?.data ?? []

  return (
    <section className="grid gap-4">
      {promos.isPending ? (
        <div className="grid gap-3">
          <PromoSkeleton />
          <PromoSkeleton />
        </div>
      ) : null}

      {promos.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="font-semibold text-foreground">Daftar promo gagal dimuat.</p>
          <p className="mt-1 text-muted-foreground">Periksa koneksi lalu coba lagi.</p>
          <Button className="mt-4" variant="outline" onClick={() => void promos.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!promos.isPending && !promos.isError && rows.length === 0 ? (
        <EmptyState
          title="Belum ada promo yang berjalan"
          description="Promo baru muncul di sini begitu venue mengaktifkannya. Punya kode voucher? Kodenya tetap bisa dipakai langsung di halaman checkout."
          actionHref="/lapangan"
          actionLabel="Lihat lapangan"
        />
      ) : null}

      <ul className="grid gap-3">
        {rows.map((promo) => {
          const value = promoValueLabel(promo)
          const quota = promoQuotaLabel(promo.quota_total, promo.quota_used)

          return (
            <li key={promo.id}>
              <Card className="p-5">
                <div className="flex items-start gap-4">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
                    aria-hidden
                  >
                    <TicketPercent className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-bold text-foreground">
                        {promo.name}
                      </p>
                      <Badge variant="secondary">
                        <Sparkles className="size-3" aria-hidden />
                        Otomatis
                      </Badge>
                    </div>

                    {value ? (
                      <p className="mt-1 font-display text-lg font-bold text-primary">{value}</p>
                    ) : null}

                    {promo.description ? (
                      <p className="mt-1 leading-relaxed text-muted-foreground">
                        {promo.description}
                      </p>
                    ) : null}

                    <ul className="mt-3 grid gap-1 text-sm text-muted-foreground">
                      <li>Berlaku untuk {promoAppliesToLabel(promo.applies_to).toLowerCase()}</li>
                      {promo.min_transaction_amount > 0 ? (
                        <li>Minimal transaksi {formatRupiah(promo.min_transaction_amount)}</li>
                      ) : null}
                      {promo.min_slot_count ? <li>Minimal {promo.min_slot_count} slot</li> : null}
                      {promo.is_new_customer_only ? <li>Khusus pemain baru</li> : null}
                      {quota ? <li>{quota}</li> : null}
                    </ul>

                    <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden />
                      Sampai {formatDateWita(promo.valid_until)}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
