import type { ReactNode } from 'react'
import { formatDelta } from '../../lib/analytics/format.ts'
import { STATUS_COLORS } from '../charts/palette.ts'
import { Sparkline } from '../charts/Sparkline.tsx'

interface KpiCardProps {
  readonly color: string
  /**
   * Persen perubahan terhadap periode pembanding. `null` berarti tidak ada
   * pembanding — kartu menampilkan keterangannya saja, tanpa panah dan tanpa
   * label pengganti: "0%" atau "Baru" akan terbaca sebagai hasil pengukuran.
   */
  readonly delta: number | null
  readonly deltaCaption: string
  /** Untuk metrik yang justru membaik saat turun (mis. pembatalan). */
  readonly isUpGood?: boolean
  readonly label: string
  readonly trend: readonly number[]
  readonly value: string
}

const GOOD_TEXT = '#006300'

/**
 * Kartu KPI: label, angka, delta, dan sparkline.
 *
 * Angkanya memakai angka proporsional bawaan font — `tabular-nums` hanya untuk
 * kolom yang harus lurus ke bawah, dan pada ukuran display ia membuat angka
 * seperti 121 terlihat renggang.
 */
export function KpiCard({
  color,
  delta,
  deltaCaption,
  isUpGood = true,
  label,
  trend,
  value,
}: KpiCardProps): ReactNode {
  const isPositive = delta !== null && delta > 0
  const isFlat = delta === 0
  const isGood = isUpGood ? isPositive : !isPositive

  return (
    <div className="kpi-card">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      {delta === null ? (
        <p className="kpi-delta kpi-delta-plain">
          <small>{deltaCaption}</small>
        </p>
      ) : (
        <p
          className="kpi-delta"
          style={{ color: isFlat ? undefined : isGood ? GOOD_TEXT : STATUS_COLORS.critical }}
        >
          <span aria-hidden="true">{isFlat ? '→' : isPositive ? '↗' : '↘'}</span>{' '}
          {formatDelta(delta)} <small>{deltaCaption}</small>
        </p>
      )}
      <Sparkline color={color} description={`Tren harian ${label}`} values={trend} />
    </div>
  )
}
