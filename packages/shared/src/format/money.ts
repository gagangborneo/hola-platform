/**
 * Format rupiah.
 *
 * Uang bertipe `number` integer rupiah (docs/16 BR-TS-07) — tanpa desimal, tanpa
 * float. Pemisah ribuan Indonesia adalah titik.
 *
 * Sengaja TIDAK memakai `Intl.NumberFormat`: packages/shared jalan juga di React
 * Native, tempat ketersediaan & versi ICU berbeda antar perangkat. Hasil yang
 * berbeda antar perangkat pada angka uang tidak dapat diterima, dan test wajib
 * deterministik (docs/16 BR-TT-10).
 */

export interface FormatIdrOptions {
  /** Sertakan prefiks `Rp `. Default: true. */
  withSymbol?: boolean
}

/** `150000` → `"Rp 150.000"`. */
export function formatIDR(amount: number, options: FormatIdrOptions = {}): string {
  if (!Number.isFinite(amount)) {
    throw new Error(`formatIDR menerima nilai bukan angka berhingga: ${amount}`)
  }
  if (!Number.isInteger(amount)) {
    throw new Error(`Uang wajib integer rupiah (docs/16 BR-TS-07), diterima: ${amount}`)
  }
  const withSymbol = options.withSymbol ?? true
  const sign = amount < 0 ? '-' : ''
  const digits = groupThousands(Math.abs(amount))
  return withSymbol ? `${sign}Rp ${digits}` : `${sign}${digits}`
}

function groupThousands(n: number): string {
  const s = String(n)
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const fromEnd = s.length - i
    out += s[i]
    if (fromEnd > 1 && fromEnd % 3 === 1) out += '.'
  }
  return out
}
