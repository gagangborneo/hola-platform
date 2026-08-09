'use client'

import type { ReactNode } from 'react'
import type { PeriodKey } from '../../lib/analytics/periods.ts'
import { PERIOD_OPTIONS } from '../../lib/analytics/periods.ts'

interface AnalyticsHeaderProps {
  readonly onPeriodChange: (period: PeriodKey) => void
  readonly period: PeriodKey
  readonly subtitle: string
  readonly title: string
  readonly updatedAt: string
}

/**
 * Satu baris filter di atas segalanya yang ia lingkupi.
 *
 * Filter tidak diletakkan di dalam kartu bagan: kalau tiap kartu punya
 * filternya sendiri, dua bagan yang bersebelahan bisa memotret periode berbeda
 * dan pembaca tidak punya cara tahu.
 */
export function AnalyticsHeader({
  onPeriodChange,
  period,
  subtitle,
  title,
  updatedAt,
}: AnalyticsHeaderProps): ReactNode {
  return (
    <header className="analytics-header">
      <div className="analytics-title">
        <p className="eyebrow">Dashboard</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>

      <div className="analytics-filters">
        <label className="table-filter">
          Periode
          <select
            onChange={(event) => onPeriodChange(event.target.value as PeriodKey)}
            value={period}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="filter-chip">Hola Sports Center · Balikpapan</span>
        <div className="filter-meta">
          <small>Update terakhir</small>
          <strong>{updatedAt}</strong>
        </div>
        <button className="button-secondary" onClick={() => globalThis.print?.()} type="button">
          Cetak / PDF
        </button>
      </div>
    </header>
  )
}
