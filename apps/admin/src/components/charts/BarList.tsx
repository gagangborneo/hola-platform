import type { ReactNode } from 'react'
import { ORDINAL_BLUE, SERIES_COLORS } from './palette.ts'

export interface BarItem {
  readonly detail?: string
  readonly key: string
  readonly label: string
  readonly value: number
}

interface BarListProps {
  readonly formatValue: (value: number) => string
  readonly items: readonly BarItem[]
  /**
   * Untuk kategori yang PUNYA urutan alami (tier, ember aging, rentang waktu):
   * ramp satu hue mengikuti urutannya. Jangan dinyalakan untuk kategori nominal
   * — di sana ramp hanya mengulang panjang batang sebagai warna.
   */
  readonly ordinal?: boolean
}

/**
 * Peringkat kategori nominal.
 *
 * Satu seri, jadi satu warna untuk semua batang — mewarnai batang lebih gelap
 * karena lebih besar akan mengulang panjang batang sebagai warna dan membakar
 * satu-satunya kanal yang tersisa demi informasi yang sudah terlihat.
 */
export function BarList({ formatValue, items, ordinal = false }: BarListProps): ReactNode {
  const max = Math.max(...items.map((item) => item.value), 1)
  const colorFor = (index: number): string => {
    if (!ordinal) return SERIES_COLORS.blue
    const step = Math.round((index / Math.max(items.length - 1, 1)) * (ORDINAL_BLUE.length - 1))
    return ORDINAL_BLUE[ORDINAL_BLUE.length - 1 - step] ?? SERIES_COLORS.blue
  }

  return (
    <ul className="bar-list">
      {items.map((item, index) => (
        <li key={item.key}>
          <div className="bar-list-head">
            <span>{item.label}</span>
            <b>{formatValue(item.value)}</b>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ background: colorFor(index), width: `${(item.value / max) * 100}%` }}
            />
          </div>
          {item.detail === undefined ? null : <small>{item.detail}</small>}
        </li>
      ))}
    </ul>
  )
}
