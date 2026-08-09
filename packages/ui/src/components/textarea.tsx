import type { ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/cn.ts'

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactNode {
  return (
    <textarea
      className={cn(
        'flex min-h-24 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color] outline-none',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25',
        'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
