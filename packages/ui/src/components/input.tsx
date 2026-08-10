import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn.ts'

/**
 * Input teks.
 *
 * `aria-invalid` yang mengubah tampilan, bukan sebuah prop `error` terpisah:
 * atributnya sudah harus ada demi pembaca layar, jadi menjadikannya juga
 * pemicu gaya menghapus satu sumber kebenaran yang bisa melenceng — kotak
 * merah tanpa pengumuman ke pembaca layar, atau sebaliknya.
 *
 * `suppressHydrationWarning` bukan tambalan malas: ekstensi password manager
 * menempelkan `style` berisi ikonnya sendiri ke input sebelum React hydrate,
 * dan React membaca itu sebagai mismatch lalu membuang seluruh pohon untuk
 * dirender ulang di klien. Isi browser pengguna di luar kendali kita, jadi
 * atribut input memang sengaja tidak dibandingkan saat hydrate.
 */
export function Input({
  className,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return (
    <input
      className={cn(
        'flex h-10 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none',
        'placeholder:text-muted-foreground',
        'selection:bg-primary selection:text-primary-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25',
        'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        className,
      )}
      type={type}
      {...props}
      suppressHydrationWarning
    />
  )
}
