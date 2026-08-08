'use client'

import { HolaApiError } from '@hola/api-client'
import type { Quote } from '@hola/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatRupiah, formatTimeWita, witaDateKey } from '../../lib/format.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import { type CourtLimits, validateSelection } from './checkout-validation.ts'
import { bookingIdempotencyKey, clearBookingIdempotencyKey } from './idempotency.ts'
import { QuoteSummary } from './QuoteSummary.tsx'

interface CheckoutFormProps {
  courtId: string
  /** Slug publik court — dipakai untuk membangun tautan kembali ke `/lapangan/{code}`. */
  courtCode: string
  startsAtList: readonly string[]
  limits: readonly CourtLimits[]
  requireContiguousSlots: boolean
  cancellationPolicyText: string | null
}

export function CheckoutForm({
  courtId,
  courtCode,
  startsAtList,
  limits,
  requireContiguousSlots,
  cancellationPolicyText,
}: CheckoutFormProps): ReactNode {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [promoCode, setPromoCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  // I6: spek § 4.5 mewajibkan flow BERHENTI dan meminta persetujuan eksplisit atas harga
  // baru saat `PRICE_CHANGED`/`PROMO_QUOTA_EXHAUSTED` muncul — sebelumnya hanya catatan
  // non-blocking dan tombol bayar tetap aktif.
  const [priceAcknowledged, setPriceAcknowledged] = useState(false)

  const slots = startsAtList.map((startsAt) => ({ courtId, startsAt }))
  const selectionError = validateSelection({ slots, limits, requireContiguousSlots })
  const items = startsAtList.map((startsAt) => ({ court_id: courtId, starts_at: startsAt }))

  // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa pun —
  // `$post()` di bawah TIDAK PERNAH resolve dengan Response ber-`.ok === false`
  // (lihat `apps/web/src/lib/server-api.ts` untuk pembuktian yang sama di jalur
  // server). Karena itu kegagalan ditangani lewat `query.error`/`onError`
  // (react-query menangkap promise yang reject), bukan `if (!response.ok)`.
  const quote = useQuery({
    queryKey: ['quote', courtId, startsAtList, promoCode],
    enabled: selectionError === null,
    queryFn: async (): Promise<{ data: Quote }> => {
      const response = await apiClient.api.v1.bookings.quote.$post({
        json: { items, addons: [], ...(promoCode ? { promo_code: promoCode } : {}) },
      })
      // `InferResponseType` menyisipkan `| undefined` eksplisit pada field
      // opsional (round-trip lewat representasi JSON Hono), sehingga tidak
      // structurally-assignable ke `Quote` di bawah `exactOptionalPropertyTypes`
      // walau nilainya identik — inilah persis `Quote` yang dikembalikan
      // `computeQuote()` di peladen (`POST /bookings/quote` mengembalikan
      // `ok(quote)` apa adanya). Cast ini murni menjembatani gesekan tipe di
      // atas, bukan menebak/mengubah bentuk datanya.
      return (await response.json()) as { data: Quote }
    },
  })

  const hasPriceWarning = (quote.data?.data.warnings ?? []).some(
    (warning) => warning.code === 'PROMO_QUOTA_EXHAUSTED' || warning.code === 'PRICE_CHANGED',
  )
  const totalAmount = quote.data?.data.total_amount

  // I6: setiap kali total yang ditagihkan berubah nilai (kuota promo baru habis, price
  // rule berubah, promo code diganti, dst.), persetujuan sebelumnya TIDAK ikut terbawa —
  // customer wajib menyetujui ulang angka yang baru, bukan angka yang sudah kedaluwarsa.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `totalAmount` sengaja jadi satu-satunya pemicu — bukan dibaca di badan efek.
  useEffect(() => {
    setPriceAcknowledged(false)
  }, [totalAmount])

  const createBooking = useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.v1.bookings.$post(
        { json: { items, addons: [], ...(promoCode ? { promo_code: promoCode } : {}) } },
        { headers: { 'Idempotency-Key': bookingIdempotencyKey(courtId, startsAtList) } },
      )
      return response.json()
    },
    onSuccess: (body) => {
      clearBookingIdempotencyKey()
      router.push(`/booking/${body.data.id}`)
    },
    onError: (mutationError: Error) => {
      // E-3 / I2: slot baru saja diambil orang lain — tidak ada gunanya biarkan
      // customer terjebak di checkout mati, kirim kembali ke GRID KETERSEDIAAN COURT
      // INI pada TANGGAL YANG SAMA (spek § 4.4), bukan ke daftar lapangan tanpa
      // konteks. `setError` di sini SENGAJA tidak dipakai untuk pesannya: baris
      // berikutnya langsung `router.push`, jadi apa pun yang di-set di sini tidak
      // pernah sempat dirender — pesannya dibawa lewat `?diambil=1` dan ditampilkan
      // oleh `CourtAvailabilitySection` di halaman tujuan.
      if (mutationError instanceof HolaApiError && mutationError.code === 'SLOT_ALREADY_CLAIMED') {
        queryClient.invalidateQueries({ queryKey: ['availability', courtId] })
        const params = new URLSearchParams({ diambil: '1' })
        const conflictDate = startsAtList[0]
        if (conflictDate) params.set('tanggal', witaDateKey(conflictDate))
        router.push(`/lapangan/${encodeURIComponent(courtCode)}?${params.toString()}`)
        return
      }
      // BR-B-14: customer sudah menahan 3 booking belum dibayar.
      if (mutationError instanceof HolaApiError && mutationError.code === 'CONFLICT') {
        setError('Kamu punya 3 booking yang belum dibayar. Selesaikan dulu salah satunya.')
        router.push('/akun/booking?pending=1')
        return
      }
      setError('Booking gagal dibuat. Coba lagi.')
    },
  })

  return (
    <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
      <div>
        <h2 className="font-display text-2xl font-bold">Slot yang dipilih</h2>
        <ul className="mt-4 grid gap-2">
          {startsAtList.map((startsAt) => (
            <li key={startsAt} className="rounded-xl border bg-card px-4 py-3 font-semibold">
              {formatTimeWita(startsAt)}
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-1.5">
          <Label htmlFor="promo">Kode promo</Label>
          <Input
            id="promo"
            value={promoCode}
            onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
            placeholder="Opsional"
          />
        </div>

        {cancellationPolicyText ? (
          <div className="mt-6 rounded-xl bg-secondary p-4">
            <p className="font-semibold text-secondary-foreground">Kebijakan pembatalan</p>
            <p className="mt-2 whitespace-pre-line text-sm text-secondary-foreground">
              {cancellationPolicyText}
            </p>
          </div>
        ) : null}
      </div>

      <aside className="h-fit rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl font-bold">Ringkasan</h2>
        {selectionError ? (
          // C1: sebuah `selectionError` di sini berarti tidak ada harga, tidak ada tombol
          // bayar — tautan ini WAJIB ada supaya customer tidak terjebak tanpa jalan maju
          // maupun mundur selain tombol back browser (mis. jumlah slot di luar
          // `min_slots_per_booking`/`max_slots_per_booking`, atau `SLOTS_NOT_CONTIGUOUS`
          // saat venue mewajibkan kontiguitas).
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">
            <p>{selectionError.message}</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href={`/lapangan/${encodeURIComponent(courtCode)}`}>Kembali pilih slot</Link>
            </Button>
          </div>
        ) : null}
        {quote.isPending && selectionError === null ? (
          <p className="mt-4 text-muted-foreground">Menghitung harga…</p>
        ) : null}
        {quote.isError ? (
          <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">
            Harga tidak dapat dihitung. Coba lagi.
          </p>
        ) : null}
        {quote.data ? (
          <div className="mt-4">
            <QuoteSummary quote={quote.data.data} />
          </div>
        ) : null}
        {hasPriceWarning && quote.data ? (
          // I6 (spek § 4.5): flow BERHENTI di sini — tombol bayar tetap terkunci sampai
          // customer secara eksplisit menyetujui total baru ini. Tidak ada aritmetika:
          // angka yang ditampilkan persis `quote.data.data.total_amount` dari API.
          <div className="mt-4 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
            <p>
              Harga berubah sejak kamu memilih slot. Total yang akan ditagihkan sekarang:{' '}
              <span className="font-display text-base font-bold">
                {formatRupiah(quote.data.data.total_amount)}
              </span>
              .
            </p>
            <label className="mt-3 flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={priceAcknowledged}
                onChange={(event) => setPriceAcknowledged(event.target.checked)}
              />
              <span>Saya menyetujui total harga baru ini dan ingin melanjutkan.</span>
            </label>
          </div>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>
        ) : null}
        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={
            selectionError !== null ||
            !quote.data ||
            createBooking.isPending ||
            (hasPriceWarning && !priceAcknowledged)
          }
          onClick={() => createBooking.mutate()}
        >
          {createBooking.isPending ? 'Mengunci slot…' : 'Kunci slot & bayar'}
        </Button>
      </aside>
    </div>
  )
}
