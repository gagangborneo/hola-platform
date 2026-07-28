import { describe, expect, it } from 'vitest'
import { WEAK_PASSWORD_COUNT, WEAK_PASSWORDS } from './weak-passwords.ts'

describe('kamus password umum', () => {
  it('F0-43: memuat tepat 10.000 password umum dan menangkap nilai paling lemah', () => {
    expect(WEAK_PASSWORDS).toHaveLength(WEAK_PASSWORD_COUNT)
    expect(WEAK_PASSWORDS.has('password')).toBe(true)
    expect(WEAK_PASSWORDS.has('123456')).toBe(true)
  })
})
