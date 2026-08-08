/**
 * Sisa hold dihitung dari jam peladen, bukan jam perangkat (E-23).
 * `offsetMs` adalah `server_time − Date.now()` saat konfigurasi dimuat.
 */
export function remainingMs(holdExpiresAt: string, clientNow: number, offsetMs: number): number {
  const expiresAt = new Date(holdExpiresAt).getTime()
  return Math.max(0, expiresAt - (clientNow + offsetMs))
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
