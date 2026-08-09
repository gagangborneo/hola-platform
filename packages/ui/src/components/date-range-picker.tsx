'use client'

import { CalendarIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '../lib/cn.ts'
import { toCalendarDate, toDate } from '../lib/date-value.ts'
import { Button } from './button.tsx'
import { Calendar } from './calendar.tsx'
import { Popover, PopoverContent, PopoverTrigger } from './popover.tsx'

export interface CalendarRange {
  readonly from: string
  readonly to: string
}

export interface RangePreset {
  readonly key: string
  readonly label: string
  readonly range: () => CalendarRange
}

interface DateRangePickerProps {
  readonly className?: string
  readonly disabled?: boolean
  /** Tanggal terakhir yang boleh dipilih, mis. hari ini. */
  readonly max?: string
  readonly min?: string
  readonly onChange: (range: CalendarRange) => void
  readonly presets?: readonly RangePreset[]
  readonly range: CalendarRange
}

const formatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function label(range: CalendarRange): string {
  const from = toDate(range.from)
  const to = toDate(range.to)
  if (from === undefined || to === undefined) return 'Pilih rentang'
  if (range.from === range.to) return formatter.format(from)
  return `${formatter.format(from)} – ${formatter.format(to)}`
}

/**
 * Pemilih rentang tanggal.
 *
 * Perubahan hanya dikirim ke pemanggil setelah kedua ujung rentang terpilih.
 * Mengirim rentang setengah jadi akan memicu satu putaran pengambilan data
 * untuk rentang yang tidak diminta siapa pun — terlihat sebagai kedipan angka
 * tepat sebelum angka yang benar muncul.
 */
export function DateRangePicker({
  className,
  disabled = false,
  max,
  min,
  onChange,
  presets,
  range,
}: DateRangePickerProps): ReactNode {
  const [isOpen, setOpen] = useState(false)

  const selected = { from: toDate(range.from), to: toDate(range.to) }
  const maxDate = toDate(max)
  const minDate = toDate(min)

  // Matcher dirakit sebagai daftar, bukan satu objek dengan bidang opsional:
  // `{ after: undefined }` bukan matcher kosong bagi react-day-picker.
  const disabledDays = [
    ...(maxDate === undefined ? [] : [{ after: maxDate }]),
    ...(minDate === undefined ? [] : [{ before: minDate }]),
  ]

  /*
    Prop opsional dirakit lewat spread, bukan diteruskan sebagai `undefined`.
    Repo ini menyalakan `exactOptionalPropertyTypes`, jadi "tidak diisi" dan
    "diisi undefined" adalah dua hal berbeda — dan react-day-picker termasuk
    yang membedakannya.
  */
  const calendarProps = {
    ...(selected.from === undefined ? {} : { defaultMonth: selected.from }),
    ...(disabledDays.length === 0 ? {} : { disabled: disabledDays }),
    ...(selected.from === undefined
      ? {}
      : {
          selected: {
            from: selected.from,
            ...(selected.to === undefined ? {} : { to: selected.to }),
          },
        }),
  }

  return (
    <Popover onOpenChange={setOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          className={cn('h-10 justify-start gap-2 px-3 font-normal', className)}
          disabled={disabled}
          variant="outline"
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{label(range)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto gap-3 p-3">
        {presets === undefined ? null : (
          <div className="flex w-36 shrink-0 flex-col gap-1 border-r border-border pr-3">
            {presets.map((preset) => {
              const value = preset.range()
              const isActive = value.from === range.from && value.to === range.to
              return (
                <Button
                  className="justify-start px-2.5 font-normal"
                  key={preset.key}
                  onClick={() => {
                    onChange(value)
                    setOpen(false)
                  }}
                  size="sm"
                  variant={isActive ? 'secondary' : 'ghost'}
                >
                  {preset.label}
                </Button>
              )
            })}
          </div>
        )}
        <Calendar
          autoFocus
          mode="range"
          numberOfMonths={2}
          onSelect={(next) => {
            const from = toCalendarDate(next?.from)
            const to = toCalendarDate(next?.to)
            if (from === undefined || to === undefined) return
            onChange({ from, to })
            setOpen(false)
          }}
          {...calendarProps}
        />
      </PopoverContent>
    </Popover>
  )
}
