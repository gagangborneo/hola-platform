'use client'

import { cn } from '@hola/ui'
import { Check, Copy } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

interface CopyButtonProps {
  value: string
  /** Dibacakan pembaca layar, mis. "Salin kode booking". */
  label: string
  className?: string
}

type CopyState = 'idle' | 'copied' | 'failed'

/**
 * `navigator.clipboard` tidak ada di konteks non-secure (http selain
 * localhost) dan dapat ditolak oleh izin browser. Kegagalan itu dinyatakan
 * kepada pengguna — bukan didiamkan — supaya ia tahu harus menyalin manual.
 */
export function CopyButton({ value, label, className }: CopyButtonProps): ReactNode {
  const [state, setState] = useState<CopyState>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  const copy = async (): Promise<void> => {
    clearTimeout(resetTimer.current)
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
    resetTimer.current = setTimeout(() => setState('idle'), 2500)
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={label}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-lg border-2 border-border px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary',
          className,
        )}
      >
        {state === 'copied' ? (
          <Check className="size-3.5 text-primary" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        {state === 'copied' ? 'Tersalin' : 'Salin'}
      </button>
      <span aria-live="polite" className="text-xs text-muted-foreground">
        {state === 'failed' ? 'Gagal menyalin — salin manual.' : null}
      </span>
    </span>
  )
}
