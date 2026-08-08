'use client'

import { useQuery } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { RefreshCw } from 'lucide-react'
import type React from 'react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { cn } from '../../lib/cn.ts'
import { formatRupiah, formatTimeWita, witaDateKey } from '../../lib/format.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { Skeleton } from '../ui/skeleton.tsx'
import { isBeyondHorizon, unavailableLabel } from './availability-labels.ts'

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

export function AvailabilityGrid({
  courtId,
  horizonDays,
  serverTime,
  onSelectionChange,
}: AvailabilityGridProps): ReactNode {
  const dates = useMemo(() => dateOptions(serverTime, horizonDays), [serverTime, horizonDays])
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? witaDateKey(serverTime))
  const [selected, setSelected] = useState<AvailabilitySlot[]>([])

  const query = useQuery({
    queryKey: ['availability', courtId, selectedDate],
    // 60 detik menyamai TTL cache Redis di peladen (BR-B-41).
    staleTime: 60_000,
    queryFn: async () => {
      const response = await apiClient.api.v1.courts[':court_id'].availability.$get({
        param: { court_id: courtId },
        query: { date: selectedDate },
      })
      if (!response.ok) throw new Error('Ketersediaan tidak dapat dimuat.')
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

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* biome-ignore lint/a11y/useSemanticElements: strip tanggal bukan form; <fieldset>
          akan membawa semantik dan styling form yang tidak cocok di sini. */}
      <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Pilih tanggal">
        {dates.map((date) => (
          <Button
            key={date}
            size="sm"
            variant={date === selectedDate ? 'default' : 'outline'}
            onClick={() => setSelectedDate(date)}
          >
            {date.slice(8)}/{date.slice(5, 7)}
          </Button>
        ))}
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

      {day && !beyondHorizon ? (
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
                      {slot.rate_class ?? '—'}
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
