import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn.ts'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} {...props} />
}
