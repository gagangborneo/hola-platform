'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { formatRemaining, remainingMs } from './hold-countdown.ts'

interface HoldCountdownProps {
  holdExpiresAt: string
  offsetMs: number
  onExpired: () => void
}

export function HoldCountdown({
  holdExpiresAt,
  offsetMs,
  onExpired,
}: HoldCountdownProps): ReactNode {
  const [remaining, setRemaining] = useState(() => remainingMs(holdExpiresAt, Date.now(), offsetMs))
  const hasFired = useRef(false)

  useEffect(() => {
    const tick = (): void => {
      const next = remainingMs(holdExpiresAt, Date.now(), offsetMs)
      setRemaining(next)
      if (next === 0 && !hasFired.current) {
        hasFired.current = true
        onExpired()
      }
    }
    const timer = setInterval(tick, 1000)
    tick()
    return () => clearInterval(timer)
  }, [holdExpiresAt, offsetMs, onExpired])

  return (
    <span
      className="font-display text-3xl font-bold tabular-nums text-primary"
      role="timer"
      aria-live="polite"
      aria-label="Sisa waktu mengunci slot"
    >
      {formatRemaining(remaining)}
    </span>
  )
}
