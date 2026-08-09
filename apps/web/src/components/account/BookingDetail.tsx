'use client'

import { Button, Skeleton } from '@hola/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clock3, Download, FileText, MapPin, UserRound } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { useAuthSession } from '../../lib/auth.ts'
import type { CourtSummary } from '../../lib/court-summary.ts'
import { formatDateWita, formatRupiah, formatTimeWita } from '../../lib/format.ts'
import { accountDisplayName, accountIdentity } from '../../lib/session-identity.ts'
import { bookingChannelLabel } from '../../lib/status-labels.ts'
import { rateClassLabel } from '../booking/availability-labels.ts'
import { CopyButton } from '../common/CopyButton.tsx'
import { BookingQr } from './BookingQr.tsx'
import { BookingStatusBadges } from './BookingStatusBadges.tsx'
import { CancelDialog } from './CancelDialog.tsx'

interface BookingDetailProps {
  bookingId: string
  cancellationPolicyText: string | null
  /** Peta `court_id` → nama lapangan, diambil di peladen (`GET /courts`). */
  courts: Record<string, CourtSummary>
}

/**
 * `quote` adalah snapshot JSON yang bentuknya ditentukan pipeline harga API dan
 * tidak dijamin oleh tipe respons. Dibaca defensif: baris rincian hanya tampil
 * untuk angka yang benar-benar ada. BR-B-12 — nilainya ditampilkan apa adanya,
 * tidak pernah dihitung ulang di klien.
 */
function quoteAmount(quote: unknown, key: string): number | null {
  if (typeof quote !== 'object' || quote === null) return null
  const value = (quote as Record<string, unknown>)[key]
  return typeof value === 'number' ? value : null
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof UserRound
  label: string
  children: ReactNode
}): ReactNode {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 font-semibold text-foreground">{children}</dd>
      </div>
    </div>
  )
}

function AmountRow({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}

export function BookingDetail({
  bookingId,
  cancellationPolicyText,
  courts,
}: BookingDetailProps): ReactNode {
  const queryClient = useQueryClient()
  const session = useAuthSession()

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

  if (booking.isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (booking.isError || !booking.data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6">
        <p className="font-semibold text-foreground">Booking tidak ditemukan.</p>
        <p className="mt-1 text-muted-foreground">
          Tautannya mungkin sudah tidak berlaku, atau booking ini bukan milik akun yang sedang
          masuk.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/akun/booking">Kembali ke Booking Saya</Link>
        </Button>
      </div>
    )
  }

  const data = booking.data.data
  const items = [...data.items].sort((left, right) => left.starts_at.localeCompare(right.starts_at))
  const firstItem = items[0]
  const lastItem = items[items.length - 1]

  // Booking milik sendiri tidak menyimpan nama di baris booking — namanya ada di
  // sesi. `guest_name` hanya terisi untuk booking yang dibuatkan staff.
  const bookerName = data.guest_name ?? accountDisplayName(session.user)
  const bookerContact = data.guest_phone ?? accountIdentity(session.user)

  const courtNames = [
    ...new Set(
      items.map((item) => {
        const court = courts[item.court_id]
        return court ? `${court.name} (${court.code})` : 'Lapangan Hola'
      }),
    ),
  ]

  const isPending = data.status === 'pending_payment'
  const isUsable = data.status === 'confirmed' || data.status === 'completed'
  const bookingDate = `${data.booking_date}T00:00:00+08:00`

  const subtotal = quoteAmount(data.quote, 'subtotal_amount')
  const discount = quoteAmount(data.quote, 'discount_amount')
  const fee = quoteAmount(data.quote, 'fee_amount')
  const tax = quoteAmount(data.quote, 'tax_amount')

  return (
    <div className="grid gap-4">
      {/* Kartu e-tiket: identitas booking, QR, dan empat fakta yang paling
          sering dicari sebelum berangkat main. */}
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              E-tiket booking
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
              {data.booking_code}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadges status={data.status} checkedInAt={data.checked_in_at} />
          </div>
        </div>

        <div className="mt-3">
          <CopyButton value={data.booking_code} label="Salin kode booking" />
        </div>

        <div className="mt-6 flex flex-col gap-6 border-t pt-6 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <BookingQr
              bookingCode={data.booking_code}
              isActive={isUsable}
              inactiveReason={
                isPending
                  ? 'QR aktif setelah pembayaran lunas'
                  : 'Booking ini tidak lagi berlaku untuk check-in'
              }
            />
            {isUsable ? (
              <p className="max-w-40 text-center text-xs leading-snug text-muted-foreground sm:text-left">
                Tunjukkan QR ini ke petugas saat tiba.
              </p>
            ) : null}
          </div>

          <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
            <DetailRow icon={UserRound} label="Pemesan">
              {bookerName}
              {bookerContact ? (
                <span className="block truncate text-sm font-normal text-muted-foreground">
                  {bookerContact}
                </span>
              ) : null}
            </DetailRow>
            <DetailRow icon={MapPin} label="Lapangan">
              {courtNames.join(', ')}
            </DetailRow>
            <DetailRow icon={CalendarDays} label="Tanggal main">
              {formatDateWita(bookingDate)}
            </DetailRow>
            <DetailRow icon={Clock3} label="Waktu">
              {firstItem && lastItem
                ? `${formatTimeWita(firstItem.starts_at)}–${formatTimeWita(lastItem.ends_at)} WITA`
                : '—'}
              <span className="block text-sm font-normal text-muted-foreground">
                {data.slot_count} slot
              </span>
            </DetailRow>
          </dl>
        </div>

        {data.checked_in_at ? (
          <p className="mt-6 rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            Check-in tercatat {formatDateWita(data.checked_in_at)} pukul{' '}
            {formatTimeWita(data.checked_in_at)} WITA.
          </p>
        ) : null}

        {isPending && data.hold_expires_at ? (
          <p className="mt-6 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            <Clock3 className="size-4 shrink-0" aria-hidden />
            Selesaikan pembayaran sebelum {formatTimeWita(data.hold_expires_at)} WITA atau slot
            dilepas otomatis.
          </p>
        ) : null}
      </section>

      {/* Rincian jadwal per slot: satu baris = satu jam main yang dibayar. */}
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Rincian jadwal</h2>
        <ul className="mt-4 grid gap-3">
          {items.map((item) => {
            const court = courts[item.court_id]
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {formatTimeWita(item.starts_at)}–{formatTimeWita(item.ends_at)} WITA
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {court ? `${court.name} · ` : ''}
                    {rateClassLabel(item.rate_class)}
                  </p>
                </div>
                <span className="font-semibold text-foreground">
                  {formatRupiah(item.line_total_amount)}
                </span>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 grid gap-2 border-t pt-4">
          {subtotal === null ? null : <AmountRow label="Subtotal" value={formatRupiah(subtotal)} />}
          {discount ? <AmountRow label="Diskon" value={`−${formatRupiah(discount)}`} /> : null}
          {fee ? <AmountRow label="Biaya layanan" value={formatRupiah(fee)} /> : null}
          {tax ? <AmountRow label="Pajak" value={formatRupiah(tax)} /> : null}
          <div className="mt-2 flex items-center justify-between gap-4 border-t pt-3">
            <span className="font-display font-bold text-foreground">Total</span>
            <span className="font-display text-2xl font-bold text-primary">
              {formatRupiah(data.total_amount)}
            </span>
          </div>
        </div>
      </section>

      {/* Informasi pesanan + berkas: hal yang dibutuhkan saat menghubungi
          customer service atau merapikan pembukuan. */}
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Informasi pesanan</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dipesan pada
            </dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {formatDateWita(data.created_at)} · {formatTimeWita(data.created_at)} WITA
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Kanal pemesanan
            </dt>
            <dd className="mt-0.5 font-semibold text-foreground">
              {bookingChannelLabel(data.channel)}
            </dd>
          </div>
          {data.customer_note ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Catatan kamu
              </dt>
              <dd className="mt-0.5 leading-relaxed text-foreground">{data.customer_note}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
          {isPending && data.hold_expires_at ? (
            <Button asChild variant="accent">
              <Link href={`/booking/${data.id}`}>Lanjutkan pembayaran</Link>
            </Button>
          ) : null}
          {isUsable ? (
            <>
              <Button asChild>
                <Link href={`/akun/booking/${data.id}/receipt?print=1`}>
                  <Download className="size-4" aria-hidden />
                  Unduh invoice
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/akun/booking/${data.id}/receipt`}>
                  <FileText className="size-4" aria-hidden />
                  Lihat e-receipt
                </Link>
              </Button>
            </>
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
      </section>
    </div>
  )
}
