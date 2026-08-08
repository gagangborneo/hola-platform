/**
 * `booking`, `event`, dan `match` sengaja menghasilkan label yang sama.
 * Response ketersediaan tidak memuat identitas pemesan (docs/06 § 5.2), dan
 * membedakan ketiganya tidak menambah nilai bagi customer.
 */
const LABELS: Record<string, string> = {
  booking: 'Sudah dipesan',
  event: 'Sudah dipesan',
  match: 'Sudah dipesan',
  maintenance: 'Perawatan',
  closed: 'Tutup',
  past: 'Sudah lewat',
  beyond_horizon: 'Belum dibuka',
}

export function unavailableLabel(reason: string | null): string {
  if (reason === null) return 'Tidak tersedia'
  return LABELS[reason] ?? 'Tidak tersedia'
}

/** E-11: hari di luar horizon tetap `200`; UI menerangkan, tidak menampilkan error. */
export function isBeyondHorizon(warnings: readonly { code: string }[] | undefined): boolean {
  return (warnings ?? []).some((warning) => warning.code === 'BEYOND_BOOKING_HORIZON')
}
