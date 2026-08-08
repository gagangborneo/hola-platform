const STORAGE_KEY = 'hola.booking.idempotency'

function selectionSignature(courtId: string, startsAtList: readonly string[]): string {
  return `${courtId}|${[...startsAtList].sort().join(',')}`
}

/**
 * Satu kunci per percobaan checkout. Klik ganda atau refresh saat request masih
 * berjalan memakai kunci yang sama sehingga peladen tidak membuat booking kedua.
 * Kunci hanya berganti ketika pilihan slot berubah.
 *
 * `crypto.randomUUID()` menghasilkan UUID v4 — middleware
 * `apps/api/src/middleware/idempotency.ts` menerima ULID ATAU UUID, jadi ini
 * memenuhi kebutuhan tanpa perlu urutan v7.
 */
export function bookingIdempotencyKey(courtId: string, startsAtList: readonly string[]): string {
  const signature = selectionSignature(courtId, startsAtList)
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (stored) {
    const parsed = JSON.parse(stored) as { signature: string; key: string }
    if (parsed.signature === signature) return parsed.key
  }
  const key = crypto.randomUUID()
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, key }))
  return key
}

export function clearBookingIdempotencyKey(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
