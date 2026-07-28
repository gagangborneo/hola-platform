import { ERROR_CODE, ERROR_HTTP_STATUS } from '@hola/shared'
import { describe, expect, it } from 'vitest'
import {
  APP_ERROR,
  AppError,
  assertPresent,
  translateDbError,
  UniqueViolationError,
} from './errors.ts'

describe('AppError', () => {
  it('F0-35: factory tersedia untuk setiap ERROR_CODE yang punya HTTP status', () => {
    expect(Object.keys(APP_ERROR).sort()).toEqual(Object.keys(ERROR_HTTP_STATUS).sort())
    for (const [code, status] of Object.entries(ERROR_HTTP_STATUS)) {
      const factory = APP_ERROR[code as keyof typeof APP_ERROR]
      const error = factory()
      expect(error.code).toBe(code)
      expect(error.status).toBe(status)
    }
  })

  it('BR-SV-22: menerjemahkan SQLSTATE 23505 beserta nama constraint', () => {
    const cause = { code: '23505', constraint_name: 'uq_slot_claims_active' }
    const translated = translateDbError(cause)
    expect(translated).toBeInstanceOf(UniqueViolationError)
    expect((translated as UniqueViolationError).constraintName).toBe('uq_slot_claims_active')
    expect(translateDbError({ cause })).toBeInstanceOf(UniqueViolationError)
    expect(translateDbError({ code: '23503' })).toEqual({ code: '23503' })
  })

  it('BR-TS-03: assertPresent melempar invariant tanpa non-null assertion', () => {
    expect(assertPresent('ada', 'nilai')).toBe('ada')
    expect(() => assertPresent(undefined, 'nilai wajib')).toThrow(AppError)
  })

  it('F0-35: error expected adalah semua status di bawah 500', () => {
    expect(APP_ERROR[ERROR_CODE.CONFLICT]().isExpected).toBe(true)
    expect(APP_ERROR[ERROR_CODE.INTERNAL_ERROR]().isExpected).toBe(false)
  })
})
