/**
 * Envelope response.
 * Sumber kebenaran: docs/04-API-CONTRACT.md § 4.
 *
 * Aturan yang dijaga di sini:
 *   - Root SELALU objek, kunci `data` selalu ada pada response sukses.
 *   - Tidak ada `success: true` di root — status HTTP sudah menyatakannya.
 *   - `meta` opsional: `pagination`, `generated_at`, `stale`, `warnings`.
 */
import type { PaginationMeta, Warning } from '@hola/shared'

export interface ResponseMeta {
  pagination?: PaginationMeta
  generated_at?: string
  stale?: boolean
  warnings?: Warning[]
  [key: string]: unknown
}

export interface SuccessEnvelope<T> {
  data: T
  meta?: ResponseMeta
}

/** Objek tunggal atau nilai apa pun. */
export function ok<T>(data: T, meta?: ResponseMeta): SuccessEnvelope<T> {
  return meta ? { data, meta } : { data }
}

/** Koleksi + pagination. */
export function okList<T>(data: T[], meta: ResponseMeta): SuccessEnvelope<T[]> {
  return { data, meta }
}

/** Aksi yang tidak mengembalikan resource (docs/04 § 4). */
export function okAction(meta?: ResponseMeta): SuccessEnvelope<{ success: true }> {
  return ok({ success: true } as const, meta)
}

/** Header response standar (docs/04 § 4 "Header response standar"). */
export const HEADER = {
  REQUEST_ID: 'X-Request-Id',
  CACHE: 'X-Cache',
  IDEMPOTENT_REPLAY: 'X-Idempotent-Replay',
  RATELIMIT_LIMIT: 'RateLimit-Limit',
  RATELIMIT_REMAINING: 'RateLimit-Remaining',
  RATELIMIT_RESET: 'RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
  IDEMPOTENCY_KEY: 'Idempotency-Key',
  INTERNAL_TOKEN: 'X-Internal-Token',
} as const
