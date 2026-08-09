/**
 * Pemformatan khusus dashboard analitik.
 *
 * Dipisah dari `lib/format.ts` dengan sengaja: file itu berjanji hanya
 * memformat, tidak berhitung, karena seluruh angka rupiah transaksional datang
 * jadi dari API (BR-B-12). Peringkasan ke "jt"/"M" di sini membagi angka, jadi
 * ia tinggal di lapisan presentasi dashboard — bukan di formatter transaksi.
 */

const decimal = new Intl.NumberFormat('id-ID')
const oneDecimal = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatNumber(value: number): string {
  return decimal.format(Math.round(value))
}

/** Rupiah ringkas untuk kartu KPI: `Rp 287,4 jt`. Nilai kecil tetap penuh. */
export function formatCompactRupiah(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${sign}Rp ${oneDecimal.format(abs / 1_000_000_000)} M`
  if (abs >= 1_000_000) return `${sign}Rp ${oneDecimal.format(abs / 1_000_000)} jt`
  if (abs >= 1_000) return `${sign}Rp ${oneDecimal.format(abs / 1_000)} rb`
  return `${sign}Rp ${decimal.format(abs)}`
}

/** Rupiah penuh untuk baris tabel yang harus bisa dijumlah pembaca. */
export function formatFullRupiah(value: number): string {
  const sign = value < 0 ? '-' : ''
  return `${sign}Rp ${decimal.format(Math.abs(Math.round(value)))}`
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace('.', ',')}%`
}

/** Delta selalu bertanda supaya arahnya terbaca tanpa membandingkan dua angka. */
export function formatDelta(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits).replace('.', ',')}%`
}

export function formatMultiplier(value: number): string {
  return `${oneDecimal.format(value)}x`.replace('.', ',')
}

/** Perubahan relatif; basis nol tidak menghasilkan "∞" tapi ditandai tak terhitung. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}
