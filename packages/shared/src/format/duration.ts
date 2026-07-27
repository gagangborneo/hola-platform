/**
 * Format durasi dalam bahasa Indonesia.
 *
 * Dipakai untuk panjang booking (`slot_duration_minutes` × jumlah slot) dan
 * hitung mundur hold slot.
 */

/**
 * `90` → `"1 jam 30 menit"`, `60` → `"1 jam"`, `45` → `"45 menit"`, `0` → `"0 menit"`.
 * Nilai negatif dijepit ke 0 — hitung mundur yang lewat menampilkan `"0 menit"`,
 * bukan durasi negatif.
 */
export function formatDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) {
    throw new Error(`formatDuration menerima nilai bukan angka berhingga: ${totalMinutes}`)
  }
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} menit`
  if (rest === 0) return `${hours} jam`
  return `${hours} jam ${rest} menit`
}

/**
 * Hitung mundur `mm:ss` untuk hold slot (docs/06 E-23 — countdown berbasis
 * `server_time`, bukan jam perangkat). Dijepit di `00:00`.
 */
export function formatCountdown(remainingSeconds: number): string {
  const total = Math.max(0, Math.floor(remainingSeconds))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
