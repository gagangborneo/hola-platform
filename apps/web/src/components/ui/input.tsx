import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border bg-input-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  )
}
