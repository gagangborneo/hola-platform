'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../lib/cn.ts'

export function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>): ReactNode {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

export function PopoverTrigger(props: ComponentProps<typeof PopoverPrimitive.Trigger>): ReactNode {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

export function PopoverAnchor(props: ComponentProps<typeof PopoverPrimitive.Anchor>): ReactNode {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export function PopoverContent({
  align = 'start',
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>): ReactNode {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          'z-50 w-auto rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        data-slot="popover-content"
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
