/** Pemilihan tinta label yang duduk DI DALAM isian berwarna (segmen funnel, sel peta). */

function channel(value: number): number {
  const ratio = value / 255
  return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const r = channel(Number.parseInt(hex.slice(1, 3), 16))
  const g = channel(Number.parseInt(hex.slice(3, 5), 16))
  const b = channel(Number.parseInt(hex.slice(5, 7), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: number, b: number): number {
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

const INK = '#132126'
const PAPER = '#ffffff'

/**
 * Label di atas isian berwarna dipilih per-langkah, bukan dipukul rata putih:
 * ramp ordinal membentang dari terang ke gelap, jadi satu pilihan tetap pasti
 * gagal di salah satu ujungnya.
 */
export function readableInkOn(background: string): string {
  const luminance = relativeLuminance(background)
  return contrast(luminance, relativeLuminance(INK)) >=
    contrast(luminance, relativeLuminance(PAPER))
    ? INK
    : PAPER
}
