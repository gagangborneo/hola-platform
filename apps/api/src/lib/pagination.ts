/**
 * Pagination cursor & offset.
 * Sumber kebenaran: docs/04-API-CONTRACT.md § 6.
 */
import {
  type CursorPaginationQuery,
  cursorPayload,
  type OffsetPaginationQuery,
  type PaginationMeta,
  WARNING_CODE,
} from '@hola/shared'
import { err } from './errors.ts'
import type { ResponseMeta } from './response.ts'

/**
 * Isi cursor. `id` SELALU disertakan sebagai tie-breaker — tanpa itu, dua baris
 * dengan sort key identik bisa terlewat atau terduplikasi antar halaman
 * (docs/04 § 6.1).
 */
export interface CursorPayload {
  k: Array<string | number>
  id: string
}

type CursorPaginationMeta = Extract<PaginationMeta, { mode: 'cursor' }>
type OffsetPaginationMeta = Extract<PaginationMeta, { mode: 'offset' }>

/** Cursor bersifat opaque bagi client — base64url, bukan JSON telanjang. */
export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

/**
 * Cursor tidak valid / dari sort berbeda → `422 VALIDATION_ERROR`
 * (docs/04 § 6.1), bukan 500. Client yang menyimpan cursor lama lalu
 * mengirimnya setelah sort berubah adalah kejadian normal.
 */
export function decodeCursor(cursor: string): CursorPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
  } catch {
    throw err.validation({ cursor: 'Cursor tidak dapat dibaca' }, 'Cursor tidak valid.')
  }
  const result = cursorPayload.safeParse(parsed)
  if (!result.success) {
    throw err.validation({ cursor: 'Bentuk cursor tidak dikenali' }, 'Cursor tidak valid.')
  }
  return result.data
}

/** Ambil `limit + 1` baris untuk mengetahui `has_more` tanpa COUNT terpisah. */
export function cursorFetchLimit(query: CursorPaginationQuery): number {
  return query.limit + 1
}

export function buildCursorMeta<T>(
  rows: T[],
  query: CursorPaginationQuery,
  toCursor: (row: T) => CursorPayload,
): { rows: T[]; pagination: CursorPaginationMeta } {
  const hasMore = rows.length > query.limit
  const page = hasMore ? rows.slice(0, query.limit) : rows
  const last = page.at(-1)
  return {
    rows: page,
    pagination: {
      mode: 'cursor',
      limit: query.limit,
      next_cursor: hasMore && last ? encodeCursor(toCursor(last)) : null,
      prev_cursor: null,
      has_more: hasMore,
    },
  }
}

/**
 * Ambang di mana `total_count` dihilangkan demi performa (docs/04 § 6.2).
 * Di atas ini, `COUNT(*)` lebih mahal daripada nilainya bagi user.
 */
export const COUNT_OMISSION_THRESHOLD = 100_000

export function offsetSql(query: OffsetPaginationQuery): { limit: number; offset: number } {
  return { limit: query.per_page, offset: (query.page - 1) * query.per_page }
}

export function buildOffsetMeta(
  query: OffsetPaginationQuery,
  totalCount: number | null,
): OffsetPaginationMeta {
  const omitted = totalCount !== null && totalCount > COUNT_OMISSION_THRESHOLD
  const count = omitted ? null : totalCount
  return {
    mode: 'offset',
    page: query.page,
    per_page: query.per_page,
    total_count: count,
    total_pages: count === null ? null : Math.ceil(count / query.per_page),
  }
}

/**
 * Meta response lengkap untuk tabel admin. Warning diwajibkan ketika COUNT
 * sengaja dihilangkan (docs/04 § 6.2), supaya UI tidak mengira `null` sebagai
 * kegagalan menghitung.
 */
export function buildOffsetResponseMeta(
  query: OffsetPaginationQuery,
  totalCount: number | null,
): ResponseMeta {
  const pagination = buildOffsetMeta(query, totalCount)
  if (totalCount === null || totalCount <= COUNT_OMISSION_THRESHOLD) return { pagination }
  return {
    pagination,
    warnings: [
      {
        code: WARNING_CODE.COUNT_OMITTED_FOR_PERFORMANCE,
        message: 'Jumlah total hasil tidak dihitung demi menjaga performa.',
      },
    ],
  }
}
