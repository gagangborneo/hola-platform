'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { DayPicker } from 'react-day-picker'
import { id as localeId } from 'react-day-picker/locale'
import { cn } from '../lib/cn.ts'
import { buttonVariants } from './button.tsx'

export type CalendarProps = ComponentProps<typeof DayPicker>

/**
 * Kalender.
 *
 * Tata letaknya dibangun ulang dengan utilitas Tailwind lewat `classNames`
 * alih-alih memuat `react-day-picker/style.css`: stylesheet itu membawa
 * warnanya sendiri, dan warna yang tidak berasal dari token akan membuat
 * kalender di admin terlihat seperti kalender dari aplikasi lain.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps): ReactNode {
  return (
    <DayPicker
      className={cn('relative p-1', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'space-y-3',
        month_caption: 'flex h-9 items-center justify-center px-8',
        caption_label: 'text-sm font-semibold capitalize',
        // Nav dirender sekali di akar meski bulannya dua, jadi ia dilabuhkan ke
        // akar — bukan ke satu bulan, yang akan membuat panah "berikutnya"
        // muncul di tengah kalender dua bulan.
        nav: 'absolute inset-x-1 top-1 z-10 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ size: 'icon', variant: 'ghost' }),
          'size-8 opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ size: 'icon', variant: 'ghost' }),
          'size-8 opacity-70 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground',
        week: 'mt-1 flex w-full',
        day: cn(
          'relative size-9 p-0 text-center text-sm',
          // Rentang terpilih diwarnai lewat sel, bukan lewat tombol, supaya
          // jembatan antar-tanggal tidak putus oleh jarak antar tombol.
          '[&:has([data-range-middle])]:bg-secondary',
          '[&:has([data-range-start])]:rounded-l-md [&:has([data-range-start])]:bg-secondary',
          '[&:has([data-range-end])]:rounded-r-md [&:has([data-range-end])]:bg-secondary',
        ),
        day_button: cn(
          'size-9 rounded-md p-0 text-sm font-normal transition-colors outline-none',
          'hover:bg-secondary hover:text-secondary-foreground',
          'focus-visible:ring-[3px] focus-visible:ring-ring/40',
        ),
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:font-semibold [&>button]:hover:bg-primary',
        range_middle:
          '[&>button]:bg-transparent [&>button]:text-secondary-foreground [&>button]:font-normal',
        today: '[&>button]:ring-1 [&>button]:ring-ring/50',
        outside: '[&>button]:text-muted-foreground/50',
        disabled: '[&>button]:pointer-events-none [&>button]:opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      locale={localeId}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  )
}
