import type { ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '../lib/cn.ts'
import { Label } from './label.tsx'

interface FieldProps {
  readonly children: (ids: { describedBy: string | undefined; id: string }) => ReactNode
  readonly className?: string
  readonly error?: string
  readonly hint?: string
  readonly label: string
  readonly required?: boolean
}

/**
 * Pembungkus satu ruas formulir: label, kontrol, petunjuk, dan pesan galat.
 *
 * `children` berupa fungsi yang menerima id, bukan elemen biasa, karena
 * penautan `htmlFor`/`aria-describedby` harus dikerjakan di satu tempat.
 * Kalau setiap pemanggil merangkai id-nya sendiri, cepat atau lambat ada satu
 * ruas yang labelnya tidak tertaut — dan itu tidak terlihat sampai seseorang
 * memakainya dengan pembaca layar.
 *
 * `suppressHydrationWarning` ada di pembungkus, bukan cuma di kontrolnya:
 * ekstensi password manager menyisipkan tombol ikonnya sebagai anak tambahan
 * di sini, dan mismatch jumlah anak hanya bisa diredam dari induknya.
 */
export function Field({
  children,
  className,
  error,
  hint,
  label,
  required = false,
}: FieldProps): ReactNode {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy =
    [hint === undefined ? null : hintId, error === undefined ? null : errorId]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={cn('grid gap-1.5', className)} suppressHydrationWarning>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children({ describedBy, id })}
      {hint === undefined ? null : (
        <p className="text-xs text-muted-foreground" id={hintId}>
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p className="text-xs font-medium text-destructive" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
