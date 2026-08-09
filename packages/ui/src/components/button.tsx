import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn.ts'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground hover:brightness-105',
        outline: 'border-2 border-border bg-transparent text-foreground hover:bg-secondary',
        ghost: 'bg-transparent text-foreground hover:bg-secondary',
        accent: 'bg-accent text-accent-foreground shadow-lg hover:brightness-110',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-110',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        default: 'h-11 px-6 text-base',
        lg: 'h-14 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  asChild = false,
  className,
  size,
  type,
  variant,
  ...props
}: ButtonProps): ReactNode {
  if (asChild) {
    return <Slot className={cn(buttonVariants({ variant, size }), className)} {...props} />
  }
  return (
    <button
      type={type ?? 'button'}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
