/**
 * Schema zod lintas modul.
 * Sumber kebenaran: docs/04-API-CONTRACT.md § 4, § 5, § 6.
 *
 * Dipakai BERSAMA oleh apps/api (validasi request) dan app frontend (validasi
 * form) — inilah yang membuat pesan validasi di form identik dengan yang
 * ditegakkan server, tanpa menduplikasi aturannya.
 */
import { z } from 'zod'
import { ERROR_CODE, WARNING_CODE } from '../constants/error-codes.ts'

// ── Primitif ─────────────────────────────────────────────────────────────────

/** ID selalu uuid string (docs/16 BR-TS-09). */
export const idSchema = z.uuid()

/** Parameter path `{id}`. */
export const idParam = z.object({ id: idSchema })

/**
 * Uang: integer rupiah, tak pernah desimal (docs/16 BR-TS-07). Boleh 0
 * (event gratis / promo 100%, docs/07 § 3.3 P10) dan tidak boleh negatif.
 */
export const money = z.number().int().min(0)

/** Uang yang boleh negatif — mis. `rounding_adjustment_amount`. */
export const signedMoney = z.number().int()

/** Timestamp lintas batas selalu ISO 8601 (docs/16 BR-TS-08). */
export const isoDateTime = z.iso.datetime({ offset: true })

/** Tanggal bisnis `YYYY-MM-DD` menurut kalender WITA. */
export const isoDate = z.iso.date()

/** Jam operasional `HH:mm` WITA. `24:00` sah sebagai jam tutup. */
export const timeOfDay = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/, 'Jam harus berformat HH:mm')

export const currency = z.literal('IDR')

/** Rentang tanggal inklusif; `to` tidak boleh mendahului `from`. */
export const dateRange = z
  .object({ from: isoDate, to: isoDate })
  .refine((v) => v.from <= v.to, { message: '`to` tidak boleh sebelum `from`', path: ['to'] })

// ── Pagination (docs/04 § 6) ─────────────────────────────────────────────────

/** § 6.1 — cursor, default untuk feed & daftar milik user. */
export const cursorPaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** Opaque base64url dari `meta.pagination.next_cursor`. Client tidak boleh membuatnya. */
  cursor: z.string().optional(),
  direction: z.enum(['forward', 'backward']).default('forward'),
})

/** § 6.2 — offset, untuk tabel admin yang butuh nomor halaman & total. */
export const offsetPaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
})

export const paginationQuery = z.union([cursorPaginationQuery, offsetPaginationQuery])

export const cursorPaginationMeta = z.object({
  mode: z.literal('cursor'),
  limit: z.number().int(),
  next_cursor: z.string().nullable(),
  prev_cursor: z.string().nullable(),
  has_more: z.boolean(),
})

export const offsetPaginationMeta = z.object({
  mode: z.literal('offset'),
  page: z.number().int(),
  per_page: z.number().int(),
  /** `null` bila > 100.000 baris — disertai warning COUNT_OMITTED_FOR_PERFORMANCE. */
  total_count: z.number().int().nullable(),
  total_pages: z.number().int().nullable(),
})

export const paginationMeta = z.discriminatedUnion('mode', [
  cursorPaginationMeta,
  offsetPaginationMeta,
])

/**
 * Isi cursor sebelum di-encode base64url. `id` SELALU disertakan sebagai
 * tie-breaker agar urutannya stabil (docs/04 § 6.1).
 */
export const cursorPayload = z.object({
  k: z.array(z.union([z.string(), z.number()])),
  id: idSchema,
})

// ── Envelope response (docs/04 § 4, § 5) ─────────────────────────────────────

export const warningSchema = z.object({
  code: z.enum(Object.values(WARNING_CODE)),
  message: z.string(),
  details: z.unknown().optional(),
})

export const errorBody = z.object({
  code: z.enum(Object.values(ERROR_CODE)),
  message: z.string(),
  details: z.unknown().optional(),
})

export const errorResponse = z.object({ error: errorBody })

/** Pencarian teks bebas pada tabel admin (docs/04 § 6.3). */
export const searchQuery = z.object({ q: z.string().trim().min(1).max(120).optional() })

export type Id = z.infer<typeof idSchema>
export type DateRange = z.infer<typeof dateRange>
export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuery>
export type OffsetPaginationQuery = z.infer<typeof offsetPaginationQuery>
export type PaginationMeta = z.infer<typeof paginationMeta>
export type Warning = z.infer<typeof warningSchema>
export type ErrorBody = z.infer<typeof errorBody>
