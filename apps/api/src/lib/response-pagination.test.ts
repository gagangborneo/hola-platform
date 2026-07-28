import {
  cursorPaginationQuery,
  ERROR_CODE,
  offsetPaginationQuery,
  WARNING_CODE,
} from '@hola/shared'
import { describe, expect, it } from 'vitest'
import { AppError } from './errors.ts'
import {
  buildCursorMeta,
  buildOffsetResponseMeta,
  cursorFetchLimit,
  decodeCursor,
  encodeCursor,
  offsetSql,
} from './pagination.ts'
import { ok, okAction, okList } from './response.ts'

const UUID_A = '018f0000-0000-7000-8000-000000000001'
const UUID_B = '018f0000-0000-7000-8000-000000000002'

describe('response envelope', () => {
  it('F0-36: membentuk envelope sukses yang konsisten', () => {
    expect(ok({ id: UUID_A })).toEqual({ data: { id: UUID_A } })
    expect(okList([{ id: UUID_A }], { stale: false })).toEqual({
      data: [{ id: UUID_A }],
      meta: { stale: false },
    })
    expect(okAction()).toEqual({ data: { success: true } })
  })
})

describe('pagination', () => {
  it('F0-36: cursor base64url round-trip dan id selalu menjadi tie-breaker', () => {
    const payload = { k: ['2026-07-28T00:00:00.000Z', 7], id: UUID_A }
    const encoded = encodeCursor(payload)
    expect(encoded).not.toContain('{')
    expect(decodeCursor(encoded)).toEqual(payload)
  })

  it('F0-36: cursor rusak menjadi 422 VALIDATION_ERROR', () => {
    expect.assertions(2)
    try {
      decodeCursor('bukan-cursor')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe(ERROR_CODE.VALIDATION_ERROR)
    }
  })

  it('F0-36: cursor memakai limit + 1 untuk menentukan has_more', () => {
    const query = cursorPaginationQuery.parse({ limit: 1 })
    const result = buildCursorMeta(
      [
        { id: UUID_A, createdAt: '2026-07-28T00:00:00.000Z' },
        { id: UUID_B, createdAt: '2026-07-27T00:00:00.000Z' },
      ],
      query,
      (row) => ({ k: [row.createdAt], id: row.id }),
    )
    expect(cursorFetchLimit(query)).toBe(2)
    expect(result.rows).toHaveLength(1)
    expect(result.pagination.has_more).toBe(true)
    expect(result.pagination.next_cursor).not.toBeNull()
  })

  it('F0-36: offset menghitung SQL offset dan warning COUNT_OMITTED', () => {
    const query = offsetPaginationQuery.parse({ page: 3, per_page: 25 })
    expect(offsetSql(query)).toEqual({ limit: 25, offset: 50 })

    const meta = buildOffsetResponseMeta(query, 100_001)
    expect(meta.pagination).toMatchObject({ total_count: null, total_pages: null })
    expect(meta.warnings?.[0]?.code).toBe(WARNING_CODE.COUNT_OMITTED_FOR_PERFORMANCE)
  })
})
