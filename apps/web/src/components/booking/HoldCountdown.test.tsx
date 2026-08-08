import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HoldCountdown } from './HoldCountdown.tsx'

const holdExpiresAt = '2026-08-10T06:10:00+08:00'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-10T06:04:00+08:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('HoldCountdown', () => {
  it('menampilkan sisa waktu dalam mm:ss', () => {
    render(<HoldCountdown holdExpiresAt={holdExpiresAt} offsetMs={0} onExpired={() => undefined} />)

    expect(screen.getByText('06:00')).toBeDefined()
  })

  it('P1-75: memanggil onExpired sekali ketika hold habis', () => {
    const onExpired = vi.fn()
    render(<HoldCountdown holdExpiresAt={holdExpiresAt} offsetMs={0} onExpired={onExpired} />)

    act(() => {
      vi.advanceTimersByTime(6 * 60_000 + 2_000)
    })

    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(screen.getByText('00:00')).toBeDefined()
  })
})
