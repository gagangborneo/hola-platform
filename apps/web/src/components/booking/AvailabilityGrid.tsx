'use client'

import { Badge, Button, cn, Skeleton } from '@hola/ui'
import { useQuery } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { CalendarDays, RefreshCw } from 'lucide-react'
import type React from 'react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import {
  formatDateWita,
  formatDayNumberWita,
  formatMonthShortWita,
  formatRupiah,
  formatTimeWita,
  formatWeekdayShortWita,
  isWitaWeekend,
  witaDateKey,
} from '../../lib/format.ts'
import { EmptyState } from '../common/EmptyState.tsx'
import { isBeyondHorizon, rateClassLabel, unavailableLabel } from './availability-labels.ts'

type AvailabilityResponse = InferResponseType<
  (typeof apiClient.api.v1.courts)[':court_id']['availability']['$get'],
  200
>
export type AvailabilityDay = AvailabilityResponse['data']['days'][number]
export type AvailabilitySlot = AvailabilityDay['slots'][number]

interface AvailabilityGridProps {
  courtId: string
  horizonDays: number
  serverTime: string
  onSelectionChange: (slots: AvailabilitySlot[]) => void
  /**
   * Tanggal awal yang dipilihkan, mis. dari `?tanggal=` saat customer dikirim
   * kembali ke sini setelah `SLOT_ALREADY_CLAIMED` (I2) — spek § 4.4 mewajibkan
   * kembali ke grid pada tanggal yang sama, bukan tanggal pertama horizon.
   * Diabaikan kalau di luar `dateOptions()`.
   */
  initialDate?: string
}

function dateOptions(serverTime: string, horizonDays: number): string[] {
  const start = new Date(serverTime)
  const span = Math.min(horizonDays, 14)
  return Array.from({ length: span }, (_, index) => {
    const date = new Date(start)
    date.setDate(date.getDate() + index)
    return witaDateKey(date.toISOString())
  })
}

/**
 * `dateOptions` selalu mulai dari tanggal WITA milik `serverTime`, jadi indeks 0
 * adalah hari ini menurut peladen — bukan menurut jam peramban customer, yang
 * bisa berbeda hari saat dia sedang di zona waktu lain.
 */
function relativeDayLabel(index: number): string | null {
  if (index === 0) return 'Hari ini'
  if (index === 1) return 'Besok'
  return null
}

export function AvailabilityGrid({
  courtId,
  horizonDays,
  serverTime,
  onSelectionChange,
  initialDate,
}: AvailabilityGridProps): ReactNode {
  const dates = useMemo(() => dateOptions(serverTime, horizonDays), [serverTime, horizonDays])
  const [selectedDate, setSelectedDate] = useState(
    () =>
      (initialDate && dates.includes(initialDate) ? initialDate : dates[0]) ??
      witaDateKey(serverTime),
  )
  const [selected, setSelected] = useState<AvailabilitySlot[]>([])

  const query = useQuery({
    queryKey: ['availability', courtId, selectedDate],
    // 60 detik menyamai TTL cache Redis di peladen (BR-B-41).
    staleTime: 60_000,
    // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa pun —
    // `$get` di bawah TIDAK PERNAH resolve dengan Response ber-`.ok === false`,
    // jadi kegagalan sudah ditangani lewat `query.isError` (react-query
    // menangkap promise yang reject), bukan `if (!response.ok)`.
    queryFn: async () => {
      const response = await apiClient.api.v1.courts[':court_id'].availability.$get({
        param: { court_id: courtId },
        query: { date: selectedDate },
      })
      return response.json()
    },
  })

  useEffect(() => {
    onSelectionChange(selected)
  }, [selected, onSelectionChange])

  // Ganti tanggal berarti mulai memilih dari nol: satu booking hanya boleh satu tanggal.
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedDate sengaja jadi pemicu efek ini walau tidak dipakai di badannya
  useEffect(() => {
    setSelected([])
  }, [selectedDate])

  const toggle = (slot: AvailabilitySlot): void => {
    setSelected((current) =>
      current.some((item) => item.starts_at === slot.starts_at)
        ? current.filter((item) => item.starts_at !== slot.starts_at)
        : [...current, slot],
    )
  }

  const day = query.data?.data.days[0]
  const beyondHorizon = isBeyondHorizon(query.data?.meta?.warnings)

  const [pullStartY, setPullStartY] = useState<number | null>(null)

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>): void => {
    if (window.scrollY > 0) return
    setPullStartY(event.touches[0]?.clientY ?? null)
  }

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>): void => {
    const endY = event.changedTouches[0]?.clientY ?? 0
    // 80 px cukup jauh untuk membedakan tarikan sengaja dari gulir biasa.
    if (pullStartY !== null && endY - pullStartY > 80) void query.refetch()
    setPullStartY(null)
  }

  const selectedIndex = dates.indexOf(selectedDate)
  const selectedRelativeLabel = relativeDayLabel(selectedIndex)

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CalendarDays size={18} className="text-primary" aria-hidden />
        <p className="font-display text-lg font-bold text-foreground">
          {formatDateWita(selectedDate)}
        </p>
        {selectedRelativeLabel ? <Badge variant="secondary">{selectedRelativeLabel}</Badge> : null}
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: strip tanggal bukan form; <fieldset>
          akan membawa semantik dan styling form yang tidak cocok di sini. */}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
        role="group"
        aria-label="Pilih tanggal"
      >
        {dates.map((date, index) => {
          const isActive = date === selectedDate
          const isWeekend = isWitaWeekend(date)
          const relative = relativeDayLabel(index)
          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              aria-pressed={isActive}
              // Nama aksesibel lengkap; tiga baris terpisah di dalam pil terbaca
              // sebagai "Sen 10 Agu" oleh pembaca layar tanpa ini.
              aria-label={`${formatDateWita(date)}${relative ? ` (${relative})` : ''}`}
              className={cn(
                'flex w-18 shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-2 py-2.5 transition-all',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'border-border bg-card hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md',
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-bold uppercase tracking-wider',
                  isActive
                    ? 'text-primary-foreground/75'
                    : isWeekend
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                )}
              >
                {formatWeekdayShortWita(date)}
              </span>
              <span className="font-display text-2xl font-bold leading-none">
                {formatDayNumberWita(date)}
              </span>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  isActive ? 'text-primary-foreground/75' : 'text-muted-foreground',
                )}
              >
                {formatMonthShortWita(date)}
              </span>
              {/* Penanda hari ini tetap terlihat walau pil-nya tidak terpilih —
                  tanpa ini customer kehilangan titik acuan begitu menggeser strip. */}
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 h-1 w-1 rounded-full',
                  index === 0
                    ? isActive
                      ? 'bg-primary-foreground'
                      : 'bg-primary'
                    : 'bg-transparent',
                )}
              />
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {query.data?.meta?.generated_at
            ? `Diperbarui ${formatTimeWita(query.data.meta.generated_at)}`
            : 'Memuat ketersediaan…'}
        </p>
        <Button size="sm" variant="ghost" onClick={() => void query.refetch()}>
          <RefreshCw size={16} /> Segarkan
        </Button>
      </div>

      {query.isPending ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholder statis, panjang dan urutannya tidak pernah berubah
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <p className="mt-4 rounded-xl bg-destructive/10 p-4 text-destructive">
          Ketersediaan tidak dapat dimuat. Coba segarkan.
        </p>
      ) : null}

      {beyondHorizon ? (
        <p className="mt-4 rounded-xl bg-secondary p-4 text-secondary-foreground">
          Belum dibuka untuk pemesanan. Pilih tanggal yang lebih dekat.
        </p>
      ) : null}

      {/* C2: `day.slots` kosong bukan cuma saat "belum dibuka" (`beyondHorizon`) — API
          (`availability.service.ts`) juga mengembalikan grid kosong saat court tidak
          punya jam operasional di hari itu, tanggalnya masuk special date "tutup", atau
          court sedang nonaktif. Tanpa cabang ini, ketiga kondisi tersebut jatuh ke `<div>`
          kosong tanpa pesan apa pun. */}
      {day && !beyondHorizon && day.slots.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Lapangan tutup pada tanggal ini"
            description="Tidak ada slot yang bisa dipesan untuk tanggal ini. Coba pilih tanggal lain di atas."
          />
        </div>
      ) : null}

      {day && !beyondHorizon && day.slots.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {day.slots.map((slot) => {
            const isSelected = selected.some((item) => item.starts_at === slot.starts_at)
            return (
              <button
                key={slot.starts_at}
                type="button"
                disabled={!slot.is_available}
                onClick={() => toggle(slot)}
                aria-pressed={isSelected}
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  slot.is_available
                    ? 'bg-card hover:border-primary'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                  isSelected && 'border-primary bg-secondary ring-2 ring-primary',
                )}
              >
                <span className="block font-display text-lg font-bold">
                  {formatTimeWita(slot.starts_at)}
                </span>
                {slot.is_available ? (
                  <>
                    <Badge variant="outline" className="mt-1">
                      {rateClassLabel(slot.rate_class)}
                    </Badge>
                    <span className="mt-2 block font-semibold">
                      {/* Skema mengizinkan `price_amount` null lepas dari `is_available`
                          (harga belum terisi di sisi API) — tampilkan placeholder, JANGAN
                          format angka fallback: itu akan tampak sebagai harga sungguhan. */}
                      {slot.price_amount === null ? '—' : formatRupiah(slot.price_amount)}
                    </span>
                  </>
                ) : (
                  <span className="mt-2 block text-sm">
                    {unavailableLabel(slot.unavailable_reason)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
