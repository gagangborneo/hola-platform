import { ERROR_CODE, USER_ROLE } from '@hola/shared'
import { describe, expect, it } from 'vitest'
import { assertRouteGuards, registerGuardedRoute } from '../../middleware/require-role.ts'
import { assertOwnedResource } from './authorization.ts'
import { assertPasswordAllowed, hashPassword, verifyPassword } from './password.ts'
import { serializeCustomerProfile } from './profile.serializer.ts'

const customerViewer = {
  userId: '00000000-0000-7000-8000-000000000001',
  role: USER_ROLE.CUSTOMER,
  cafeTenantId: undefined,
  employeeId: undefined,
} as const

describe('fondasi Auth & RBAC', () => {
  it('F0-43: pepper wajib untuk verifikasi argon2id', async () => {
    const env = { PASSWORD_PEPPER: 'pepper-test-yang-panjang-dan-rahasia' }
    const hash = await hashPassword('MagentaPaddle2026!', env)
    expect(await verifyPassword(hash, 'MagentaPaddle2026!', env)).toBe(true)
    expect(
      await verifyPassword(hash, 'MagentaPaddle2026!', {
        PASSWORD_PEPPER: 'pepper-berbeda-yang-panjang-sekali',
      }),
    ).toBe(false)
    expect(() =>
      assertPasswordAllowed({ password: 'password', email: 'a@hola.test', fullName: 'Pemain' }),
    ).toThrow('password yang lebih kuat')
  })

  it('F0-51: route tanpa guard dan tanpa allowlist ditolak ketika boot', () => {
    expect(() => assertRouteGuards([{ method: 'GET', path: '/baru' }], new Set())).toThrow(
      'Route tanpa requireRole',
    )
    registerGuardedRoute('GET', '/terlindungi')
    expect(() =>
      assertRouteGuards([{ method: 'GET', path: '/terlindungi' }], new Set(['GET /publik'])),
    ).not.toThrow()
  })

  it('F0-52: ownership menyamarkan resource customer, tetapi staff/admin mendapat forbidden', () => {
    try {
      assertOwnedResource(null, customerViewer)
      throw new Error('seharusnya melempar')
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODE.NOT_FOUND })
    }
    expect(() => assertOwnedResource(null, { ...customerViewer, role: USER_ROLE.STAFF })).toThrow(
      'akses',
    )
  })

  it('F0-53: serializer menyembunyikan tahun lahir dan internal notes dari role tak berhak', () => {
    const profile = {
      userId: customerViewer.userId,
      birthDate: '1997-06-12',
      gender: 'undisclosed',
      skillLevel: 'beginner',
      internalNotes: 'butuh bantuan saat check-in',
    }
    expect(serializeCustomerProfile(profile, customerViewer)).toEqual({
      user_id: customerViewer.userId,
      birth_date: '1997-06-12',
      gender: 'undisclosed',
      skill_level: 'beginner',
    })
    expect(serializeCustomerProfile(profile, { ...customerViewer, role: USER_ROLE.STAFF })).toEqual(
      {
        user_id: customerViewer.userId,
        birth_date: '06-12',
        gender: 'undisclosed',
        skill_level: 'beginner',
        internal_notes: 'butuh bantuan saat check-in',
      },
    )
  })
})
