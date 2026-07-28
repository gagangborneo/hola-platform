/**
 * Metrik in-process untuk `GET /internal/metrics`.
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 9 "Metrik minimal".
 *
 * Sengaja sederhana: counter & histogram di memori, diekspos dalam format teks
 * Prometheus. Tidak menambah dependensi (docs/16 AI-3) dan tidak butuh
 * infrastruktur metrik tersendiri di v1 — Uptime Kuma + Sentry sudah menutup
 * alerting, endpoint ini untuk diagnosis.
 *
 * Konsekuensi yang diterima: nilainya per proses dan hilang saat restart.
 * Itu memadai untuk pertanyaan yang ingin dijawab ("apakah webhook invalid
 * naik?"), dan tercatat di sini supaya tidak terbaca sebagai bug.
 */

type Labels = Record<string, string | number>

const counters = new Map<string, number>()
const histograms = new Map<string, number[]>()

function seriesKey(name: string, labels?: Labels): string {
  if (!labels || Object.keys(labels).length === 0) return name
  const parts = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${String(v).replaceAll('"', '')}"`)
  return `${name}{${parts.join(',')}}`
}

export function incrementMetric(name: string, labels?: Labels, by = 1): void {
  const key = seriesKey(name, labels)
  counters.set(key, (counters.get(key) ?? 0) + by)
}

export function observeMetric(name: string, value: number, labels?: Labels): void {
  const key = seriesKey(name, labels)
  const bucket = histograms.get(key)
  if (bucket) {
    // Batasi memori: simpan 1000 pengamatan terakhir per seri.
    if (bucket.length >= 1000) bucket.shift()
    bucket.push(value)
  } else {
    histograms.set(key, [value])
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx] ?? 0
}

/** Render format teks Prometheus. */
export function renderMetrics(): string {
  const lines: string[] = []
  for (const [key, value] of [...counters].sort()) {
    lines.push(`${key} ${value}`)
  }
  for (const [key, values] of [...histograms].sort()) {
    const sorted = [...values].sort((a, b) => a - b)
    const base = key.includes('{') ? key.slice(0, key.indexOf('{')) : key
    const labelPart = key.includes('{') ? key.slice(key.indexOf('{')) : ''
    const withQuantile = (q: string) =>
      labelPart ? `${base}{quantile="${q}",${labelPart.slice(1)}` : `${base}{quantile="${q}"}`
    lines.push(`${withQuantile('0.5')} ${percentile(sorted, 50)}`)
    lines.push(`${withQuantile('0.95')} ${percentile(sorted, 95)}`)
    lines.push(`${withQuantile('0.99')} ${percentile(sorted, 99)}`)
    lines.push(`${base}_count${labelPart} ${values.length}`)
  }
  return `${lines.join('\n')}\n`
}

/** Hanya untuk test. */
export function resetMetrics(): void {
  counters.clear()
  histograms.clear()
}
