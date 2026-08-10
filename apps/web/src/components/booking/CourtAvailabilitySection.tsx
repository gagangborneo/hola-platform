'use client'

import type { Quote } from '@hola/shared'
import { Button } from '@hola/ui'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatRupiah } from '../../lib/format.ts'
import { AvailabilityGrid, type AvailabilitySlot } from './AvailabilityGrid.tsx'
import { type CourtLimits, validateSelection } from './checkout-validation.ts'

interface CourtAvailabilitySectionProps {
  courtId: string
  horizonDays: number
  serverTime: string
  minSlotsPerBooking: number
  maxSlotsPerBooking: number
  slotDurationMinutes: number
  requireContiguousSlots: boolean
  /** I2: tanggal yang harus dipilihkan saat kembali dari `SLOT_ALREADY_CLAIMED`. */
  initialDate?: string
  /** I2: banner "slot baru saja diambil orang lain", dari `?diambil=1`. */
  slotConflictNotice?: boolean
}

export function CourtAvailabilitySection({
  courtId,
  horizonDays,
  serverTime,
  minSlotsPerBooking,
  maxSlotsPerBooking,
  slotDurationMinutes,
  requireContiguousSlots,
  initialDate,
  slotConflictNotice = false,
}: CourtAvailabilitySectionProps): ReactNode {
  const router = useRouter()
  const [selected, setSelected] = useState<AvailabilitySlot[]>([])
  const onSelectionChange = useCallback((slots: AvailabilitySlot[]) => setSelected(slots), [])

  const limits = useMemo<CourtLimits[]>(
    () => [
      { courtId, minSlots: minSlotsPerBooking, maxSlots: maxSlotsPerBooking, slotDurationMinutes },
    ],
    [courtId, minSlotsPerBooking, maxSlotsPerBooking, slotDurationMinutes],
  )

  /**
   * C1: cermin aturan yang sama dengan `/checkout` (`checkout-validation.ts`,
   * BR-B-02/BR-B-09) lewat `validateSelection` yang sama persis — bukan
   * duplikat aturan. Sebelumnya tombol ini hanya memeriksa `selected.length >
   * 0`, jadi memilih 5 slot di court ber-`max_slots_per_booking` 4 (atau slot
   * tak berurutan saat venue mewajibkan kontiguitas) membawa customer ke
   * checkout tanpa harga, tanpa tombol bayar — dan tanpa jalan kembali selain
   * tombol back browser.
   */
  const selectionError = validateSelection({
    slots: selected.map((slot) => ({ courtId, startsAt: slot.starts_at })),
    limits,
    requireContiguousSlots,
  })
  // "Pilih minimal satu slot" bukan kesalahan yang perlu diumumkan di sini — itu keadaan
  // awal yang sudah jelas dari teks "0 slot dipilih" di sebelah tombol.
  const rangeError =
    selectionError && selectionError.code !== 'EMPTY_SELECTION' ? selectionError : null

  const startsAtList = useMemo(() => selected.map((slot) => slot.starts_at).sort(), [selected])

  /**
   * BR-B-12: total di bar ini TIDAK boleh dijumlah dari `price_amount` tiap slot
   * di peramban. Selain melanggar aturan "seluruh angka rupiah datang jadi dari
   * API", penjumlahan lokal juga melewatkan pajak, biaya layanan, dan
   * penyesuaian pembulatan — angkanya akan berbeda dari yang muncul di
   * `/checkout` beberapa detik kemudian. Karena itu total di sini datang dari
   * endpoint quote yang sama persis dengan yang dipakai `CheckoutForm`.
   *
   * `POST /bookings/quote` publik tapi dibatasi 60 permintaan/menit
   * (`RATE_LIMIT_BUCKET.BOOKING_QUOTE`); `staleTime` di bawah menahan permintaan
   * ulang saat customer mengaktif-nonaktifkan slot yang sama bolak-balik.
   */
  const quote = useQuery({
    queryKey: ['availability-quote', courtId, startsAtList],
    enabled: selectionError === null,
    staleTime: 60_000,
    queryFn: async (): Promise<{ data: Quote }> => {
      const response = await apiClient.api.v1.bookings.quote.$post({
        json: {
          items: startsAtList.map((startsAt) => ({ court_id: courtId, starts_at: startsAt })),
          addons: [],
        },
      })
      // Cast yang sama dengan `CheckoutForm`: `InferResponseType` menyisipkan
      // `| undefined` pada field opsional lewat round-trip JSON Hono sehingga
      // tidak structurally-assignable ke `Quote`, walau nilainya identik.
      return (await response.json()) as { data: Quote }
    },
  })

  const goToCheckout = (): void => {
    const slots = selected.map((slot) => slot.starts_at).join(',')
    router.push(`/checkout?court=${courtId}&slots=${encodeURIComponent(slots)}`)
  }

  return (
    <>
      {slotConflictNotice ? (
        <p className="mb-4 rounded-xl bg-secondary p-4 text-secondary-foreground">
          Slot yang kamu pilih sebelumnya baru saja diambil orang lain. Pilih slot lain di tanggal
          ini, ya.
        </p>
      ) : null}
      <AvailabilityGrid
        courtId={courtId}
        horizonDays={horizonDays}
        serverTime={serverTime}
        onSelectionChange={onSelectionChange}
        {...(initialDate ? { initialDate } : {})}
      />
      {rangeError ? (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">
          {rangeError.message}
        </p>
      ) : null}
      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-lg shadow-primary/5">
        <div>
          <p className="text-sm text-muted-foreground">{selected.length} slot dipilih</p>
          <p className="font-display text-xl font-bold text-primary">
            <TotalAmount
              hasValidSelection={selectionError === null}
              isPending={quote.isPending}
              isError={quote.isError}
              totalAmount={quote.data?.data.total_amount}
            />
          </p>
          {/* Promo baru bisa dimasukkan di `/checkout`, jadi angka di atas belum
              memperhitungkannya — mengatakannya di sini lebih baik daripada
              membuat customer merasa harganya berubah diam-diam nanti. */}
          {quote.data ? (
            <p className="text-xs text-muted-foreground">
              Sudah termasuk pajak & biaya layanan, sebelum promo
            </p>
          ) : null}
        </div>
        <Button disabled={selectionError !== null} onClick={goToCheckout}>
          Lanjut ke checkout
        </Button>
      </div>
    </>
  )
}

interface TotalAmountProps {
  hasValidSelection: boolean
  isPending: boolean
  isError: boolean
  totalAmount: number | undefined
}

/**
 * Tidak pernah menampilkan angka tebakan: selama total dari peladen belum ada,
 * yang tampil adalah keadaannya (belum memilih / menghitung / gagal), bukan
 * `Rp0` yang akan terbaca sebagai harga sungguhan.
 */
function TotalAmount({
  hasValidSelection,
  isPending,
  isError,
  totalAmount,
}: TotalAmountProps): ReactNode {
  if (!hasValidSelection) return <span className="text-muted-foreground">Total —</span>
  if (isError) {
    return <span className="text-sm font-semibold text-destructive">Harga gagal dihitung</span>
  }
  if (isPending || totalAmount === undefined) {
    return <span className="text-sm font-semibold text-muted-foreground">Menghitung total…</span>
  }
  return <>Total {formatRupiah(totalAmount)}</>
}
