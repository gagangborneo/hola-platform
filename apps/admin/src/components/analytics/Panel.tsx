import type { ReactNode } from 'react'

interface PanelProps {
  readonly action?: ReactNode
  readonly children: ReactNode
  readonly subtitle?: string
  readonly title: string
}

export function Panel({ action, children, subtitle, title }: PanelProps): ReactNode {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title">{title}</h2>
          {subtitle === undefined ? null : <p className="panel-sub">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

interface FinanceRowProps {
  readonly emphasis?: boolean
  readonly label: string
  readonly total?: boolean
  readonly value: string
}

/** Baris label–angka yang dipakai panel keuangan; angkanya rata kanan dan tabular. */
export function FinanceRow({ emphasis, label, total, value }: FinanceRowProps): ReactNode {
  const className = [
    'finance-row',
    emphasis === true ? 'finance-row-strong' : '',
    total === true ? 'finance-row-total' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/**
 * Lencana status selalu membawa teks, tidak pernah warna saja: dua dari empat
 * nada berada di bawah kontras 3:1 pada permukaan terang, jadi kata di sebelah
 * titiknya yang menanggung artinya.
 */
export function ToneBadge({
  label,
  tone,
}: {
  label: string
  tone: 'good' | 'warning' | 'serious' | 'critical'
}): ReactNode {
  const color = { critical: '#d03b3b', good: '#0ca30c', serious: '#ec835a', warning: '#fab219' }[
    tone
  ]
  return (
    <span className={`tone-badge tone-${tone}`}>
      <i style={{ background: color }} />
      {label}
    </span>
  )
}
