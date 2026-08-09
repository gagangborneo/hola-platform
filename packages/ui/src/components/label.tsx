import * as LabelPrimitive from '@radix-ui/react-label'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../lib/cn.ts'

export function Label({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>): ReactNode {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-semibold text-foreground', className)}
      {...props}
    />
  )
}
