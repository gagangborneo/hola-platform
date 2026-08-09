import { describe, expect, it } from 'vitest'
import type { AuthenticatedUser } from './auth-store.ts'
import {
  accountDisplayName,
  accountIdentity,
  accountIdentityLabel,
  accountInitials,
} from './session-identity.ts'

function user(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    role: 'customer',
    email: 'pemain@hola.test',
    phone: null,
    fullName: 'Rangga Bayu',
    ...overrides,
  }
}

describe('identitas akun', () => {
  it('memakai email lebih dulu, lalu nomor HP', () => {
    expect(accountIdentity(user())).toBe('pemain@hola.test')
    expect(accountIdentity(user({ email: null, phone: '081234567890' }))).toBe('081234567890')
    expect(accountIdentity(user({ email: null, phone: null }))).toBeNull()
  })

  it('label header jatuh ke nama saat akun tidak punya email maupun HP', () => {
    expect(accountIdentityLabel(user({ email: null, phone: null }))).toBe('Rangga Bayu')
    expect(accountIdentityLabel(null)).toBe('Akun saya')
  })

  it('nama tampilan tidak pernah kosong', () => {
    expect(accountDisplayName(user({ fullName: '   ' }))).toBe('pemain@hola.test')
    expect(accountDisplayName(null)).toBe('Akun saya')
  })

  it('inisial maksimal dua huruf dan tetap ada tanpa nama', () => {
    expect(accountInitials(user())).toBe('RB')
    expect(accountInitials(user({ fullName: 'Rangga Bayu Pratama' }))).toBe('RB')
    expect(accountInitials(user({ fullName: '' }))).toBe('P')
    expect(accountInitials(user({ fullName: '', email: null, phone: '081234567890' }))).toBe('A')
    expect(accountInitials(null)).toBe('A')
  })
})
