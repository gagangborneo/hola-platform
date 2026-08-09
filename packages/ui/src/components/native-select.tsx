import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '../lib/cn.ts'

/**
 * `<select>` bawaan yang bergaya sama persis dengan `SelectTrigger` Radix.
 *
 * Dipakai DI DALAM formulir, sementara `SelectField` berbasis Radix dipakai di
 * baris filter. Pembagiannya bukan selera: formulir di sini mengandalkan
 * validasi native (`required`, `:invalid`, submit tanpa JavaScript), dan Radix
 * Select tidak ikut dalam mekanisme itu. Menukarnya menyeluruh akan mengubah
 * perilaku validasi formulir booking, harga, dan voucher — perubahan perilaku
 * yang menyamar sebagai perubahan gaya.
 *
 * Keduanya sengaja tampak identik, jadi pembedanya hanya daftar yang terbuka:
 * milik sistem operasi di formulir, milik aplikasi di filter.
 */
export function NativeSelect({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>): ReactNode {
  return (
    <div className="relative grid">
      <select
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-input bg-input-background py-2 pr-9 pl-3 text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25',
          'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        focusable="false"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}
