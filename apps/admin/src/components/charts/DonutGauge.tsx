import type { ReactNode } from 'react'
import { SERIES_COLORS, STATUS_COLORS } from './palette.ts'

interface DonutGaugeProps {
  readonly caption: string
  readonly label: string
  /** 0–100. Di atas 100 tetap digambar penuh; angkanya yang menyampaikan kelebihannya. */
  readonly percent: number
}

const SIZE = 120
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Track adalah langkah lebih terang dari ramp yang sama, supaya status terbaca sepanjang cincin. */
const TRACK = '#cde2fb'

function fillFor(percent: number): string {
  if (percent >= 80) return STATUS_COLORS.good
  if (percent >= 50) return SERIES_COLORS.blue
  return STATUS_COLORS.warning
}

export function DonutGauge({ caption, label, percent }: DonutGaugeProps): ReactNode {
  const clamped = Math.max(0, Math.min(100, percent))
  const dash = (clamped / 100) * CIRCUMFERENCE

  return (
    <figure className="gauge">
      <svg
        aria-hidden="true"
        focusable="false"
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          fill="none"
          r={RADIUS}
          stroke={TRACK}
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          fill="none"
          r={RADIUS}
          stroke={fillFor(clamped)}
          strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
          strokeLinecap="round"
          strokeWidth={STROKE}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <text className="gauge-value" textAnchor="middle" x={SIZE / 2} y={SIZE / 2 + 6}>
          {Math.round(percent)}%
        </text>
      </svg>
      <figcaption>
        <strong>{label}</strong>
        <span>{caption}</span>
      </figcaption>
    </figure>
  )
}
