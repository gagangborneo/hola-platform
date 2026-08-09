import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn.ts'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div className={cn('rounded-xl border bg-card text-card-foreground', className)} {...props} />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>): ReactNode {
  return <h3 className={cn('font-display text-lg font-bold', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props} />
}
