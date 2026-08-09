import type { ReactNode } from 'react'
import type { ChipTone } from '../../lib/labels.ts'

interface StatusChipProps {
  label: string
  tone?: ChipTone
}

/** Chip status dengan nada warna; teksnya selalu label Bahasa Indonesia, bukan enum. */
export function StatusChip({ label, tone = 'neutral' }: StatusChipProps): ReactNode {
  return <span className={`status-chip status-chip-${tone}`}>{label}</span>
}
