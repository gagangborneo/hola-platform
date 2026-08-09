'use client'

import { Button, SelectField } from '@hola/ui'
import { Printer } from 'lucide-react'
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

      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          className="min-w-56"
          label="Periode"
          onChange={(value) => onPeriodChange(value as PeriodKey)}
          options={PERIOD_OPTIONS.map((option) => ({ label: option.label, value: option.key }))}
          triggerClassName="h-10"
          value={period}
        />
        <span className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-secondary-foreground">
          Hola Sports Center · Balikpapan
        </span>
        <div className="grid gap-0.5 text-right">
          <span className="text-[0.7rem] text-muted-foreground">Update terakhir</span>
          <strong className="text-xs">{updatedAt}</strong>
        </div>
        <Button onClick={() => globalThis.print?.()} variant="secondary">
          <Printer />
          Cetak / PDF
        </Button>
      </div>
    </header>
  )
}
