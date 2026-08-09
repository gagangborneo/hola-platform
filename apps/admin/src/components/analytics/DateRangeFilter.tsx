'use client'

import { Button, DateRangePicker, type RangePreset } from '@hola/ui'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { DateRange } from '../../lib/analytics/date-range.ts'
import { parseDateRange } from '../../lib/analytics/date-range.ts'
import { MAX_RANGE_DAYS } from '../../lib/analytics/operations.ts'
import { shiftDateKey } from '../../lib/format.ts'

export type { DateRange }

interface DateRangeFilterProps {
  readonly onChange: (range: DateRange) => void
  readonly range: DateRange
  /** Tanggal bisnis hari ini (WITA); diterima sebagai prop agar pemanggil tetap deterministik. */
  readonly today: string
}

const QUICK_RANGES: readonly { days: number; key: string; label: string }[] = [
  { days: 0, key: 'today', label: 'Hari ini' },
  { days: 6, key: 'week', label: '7 hari' },
  { days: 29, key: 'month', label: '30 hari' },
  { days: 89, key: 'quarter', label: '90 hari' },
]

const MESSAGES: Record<string, string> = {
  reversed: 'Tanggal akhir tidak boleh mendahului tanggal mulai — rentang disesuaikan.',
  'too-wide': `Rentang maksimal ${MAX_RANGE_DAYS} hari — rentang disesuaikan.`,
}

/**
 * Filter rentang tanggal.
 *
 * Semua perubahan — pintasan maupun kalender — lewat satu gerbang validasi,
 * jadi tidak ada jalur yang bisa menghasilkan rentang terbalik atau selebar
 * setahun. Rentang tak sah diperbaiki lalu dilaporkan, bukan ditolak diam-diam:
 * kalender yang tidak bereaksi terbaca sebagai rusak, bukan sebagai penolakan.
 */
export function DateRangeFilter({ onChange, range, today }: DateRangeFilterProps): ReactNode {
  const [notice, setNotice] = useState<string | null>(null)

  const apply = (candidate: DateRange): void => {
    const result = parseDateRange(candidate, range)
    setNotice(result.error === null ? null : (MESSAGES[result.error] ?? null))
    if (result.range.from !== range.from || result.range.to !== range.to) onChange(result.range)
  }

  const activeQuick = QUICK_RANGES.find(
    (quick) => range.to === today && range.from === shiftDateKey(today, -quick.days),
  )
  const monthStart = `${today.slice(0, 7)}-01`

  const presets: RangePreset[] = [
    ...QUICK_RANGES.map((quick) => ({
      key: quick.key,
      label: quick.label,
      range: () => ({ from: shiftDateKey(today, -quick.days), to: today }),
    })),
    { key: 'month-to-date', label: 'Bulan ini', range: () => ({ from: monthStart, to: today }) },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted p-1">
        {QUICK_RANGES.map((quick) => (
          <Button
            aria-pressed={activeQuick?.key === quick.key}
            className="h-8 px-3 text-xs font-semibold"
            key={quick.key}
            onClick={() => apply({ from: shiftDateKey(today, -quick.days), to: today })}
            variant={activeQuick?.key === quick.key ? 'default' : 'ghost'}
          >
            {quick.label}
          </Button>
        ))}
      </div>

      <DateRangePicker max={today} onChange={apply} presets={presets} range={range} />

      {notice === null ? null : (
        <p
          className="rounded-md bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning"
          role="status"
        >
          {notice}
        </p>
      )}
    </div>
  )
}
