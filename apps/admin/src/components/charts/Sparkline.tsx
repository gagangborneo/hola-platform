import type { ReactNode } from 'react'
import { CHART_INK } from './palette.ts'

interface SparklineProps {
  readonly color: string
  /** Ringkasan teks; sparkline tidak punya sumbu jadi nilainya harus ada di kartu. */
  readonly description: string
  readonly values: readonly number[]
}

const WIDTH = 120
const HEIGHT = 30
const INSET = 4

/**
 * Garis tren tanpa sumbu untuk kartu KPI. Sengaja tidak berlabel: angka besar di
 * atasnya yang membawa nilai, sparkline hanya membawa bentuknya.
 */
export function Sparkline({ color, description, values }: SparklineProps): ReactNode {
  if (values.length < 2) return null

  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min === 0 ? 1 : max - min

  const xFor = (index: number): number =>
    INSET + (index / (values.length - 1)) * (WIDTH - INSET * 2)
  const yFor = (value: number): number =>
    HEIGHT - INSET - ((value - min) / span) * (HEIGHT - INSET * 2)

  const path = values
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${xFor(index)} ${yFor(value)}`)
    .join(' ')
  const last = values[values.length - 1] ?? 0

  return (
    <svg
      aria-hidden="true"
      className="sparkline"
      focusable="false"
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
    >
      <title>{description}</title>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle
        cx={xFor(values.length - 1)}
        cy={yFor(last)}
        fill={color}
        r="3"
        stroke={CHART_INK.surface}
        strokeWidth="2"
      />
    </svg>
  )
}
