/** Utilitas skala bersama untuk seluruh bagan. */

/**
 * Batas atas sumbu yang jatuh di angka bulat, supaya tick terbaca 0 / 500 /
 * 1.000 alih-alih 0 / 437 / 874.
 */
export function niceMax(max: number, tickCount = 4): number {
  if (max <= 0) return tickCount
  const rawStep = max / tickCount
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10
  return step * magnitude * tickCount
}

export function ticksFor(max: number, tickCount = 4): number[] {
  return Array.from({ length: tickCount + 1 }, (_, index) => (max / tickCount) * index)
}
