'use client'

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

interface Preset {
  readonly days: number
  readonly key: string
  readonly label: string
}

const PRESETS: readonly Preset[] = [
  { days: 0, key: 'today', label: 'Hari ini' },
  { days: 6, key: 'week', label: '7 hari' },
  { days: 29, key: 'month', label: '30 hari' },
  { days: 89, key: 'quarter', label: '90 hari' },
]

const MESSAGES: Record<string, string> = {
  reversed: 'Tanggal akhir tidak boleh mendahului tanggal mulai — rentang disesuaikan.',
  'too-wide': `Rentang maksimal ${MAX_RANGE_DAYS} hari — rentang disesuaikan.`,
}

function CalendarIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      className="field-icon"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}

/**
 * Filter rentang tanggal.
 *
 * Semua perubahan — preset maupun ketikan — lewat satu gerbang validasi, jadi
 * tidak ada jalur yang bisa menghasilkan rentang terbalik atau selebar setahun.
 * Rentang yang tidak sah diperbaiki lalu dilaporkan, bukan ditolak diam-diam:
 * kalender yang tidak bereaksi terbaca sebagai rusak, bukan sebagai penolakan.
 */
export function DateRangeFilter({ onChange, range, today }: DateRangeFilterProps): ReactNode {
  const [notice, setNotice] = useState<string | null>(null)

  const apply = (candidate: DateRange): void => {
    const result = parseDateRange(candidate, range)
    setNotice(result.error === null ? null : (MESSAGES[result.error] ?? null))
    if (result.range.from !== range.from || result.range.to !== range.to) onChange(result.range)
  }

  const activePreset = PRESETS.find(
    (preset) => range.to === today && range.from === shiftDateKey(today, -preset.days),
  )
  const monthStart = `${today.slice(0, 7)}-01`
  const isMonthActive =
    activePreset === undefined && range.from === monthStart && range.to === today

  return (
    <div className="range-filter">
      <fieldset className="range-presets">
        <legend className="sr-only">Rentang cepat</legend>
        {PRESETS.map((preset) => (
          <button
            aria-pressed={activePreset?.key === preset.key}
            className={activePreset?.key === preset.key ? 'range-preset is-active' : 'range-preset'}
            key={preset.key}
            onClick={() => apply({ from: shiftDateKey(today, -preset.days), to: today })}
            type="button"
          >
            {preset.label}
          </button>
        ))}
        <button
          aria-pressed={isMonthActive}
          className={isMonthActive ? 'range-preset is-active' : 'range-preset'}
          onClick={() => apply({ from: monthStart, to: today })}
          type="button"
        >
          Bulan ini
        </button>
      </fieldset>

      <div className="range-dates">
        <label className="date-field">
          <span>Dari tanggal</span>
          <span className="date-control">
            <CalendarIcon />
            <input
              max={range.to}
              onChange={(event) => apply({ from: event.target.value, to: range.to })}
              type="date"
              value={range.from}
            />
          </span>
        </label>
        <span aria-hidden="true" className="range-dash">
          –
        </span>
        <label className="date-field">
          <span>Sampai tanggal</span>
          <span className="date-control">
            <CalendarIcon />
            <input
              min={range.from}
              onChange={(event) => apply({ from: range.from, to: event.target.value })}
              type="date"
              value={range.to}
            />
          </span>
        </label>
      </div>

      {notice === null ? null : (
        <p className="range-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  )
}
