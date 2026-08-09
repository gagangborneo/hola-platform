import { describe, expect, it } from 'vitest'
import type { MyProfileRow } from './profile.repository.ts'
import { normalizeNotificationPrefs, serializeMyProfile } from './profile.serializer.ts'

const user = {
  id: '01930000-0000-7000-8000-0000000004a1',
  role: 'customer',
  email: 'pemain@hola.test',
  phone: '+628110000001',
  passwordHash: 'argon2id$…',
  fullName: 'Rangga Bayu',
  avatarMediaId: null,
  status: 'active',
  tokenVersion: 3,
  emailVerifiedAt: new Date('2026-08-01T02:00:00.000Z'),
  phoneVerifiedAt: null,
  lastLoginAt: null,
  failedLoginCount: 0,
  lockedUntil: null,
  createdAt: new Date('2026-07-01T02:00:00.000Z'),
  updatedAt: new Date('2026-08-01T02:00:00.000Z'),
} as unknown as MyProfileRow['user']

const profile = {
  userId: user.id,
  birthDate: '1997-06-12',
  gender: 'undisclosed',
  skillLevel: 'beginner',
  preferredSportId: null,
  tierCode: 'bronze',
  lifetimePoints: 120,
  referralCode: 'PRF001',
  referredByUserId: null,
  notificationPrefs: { push: false, email: true, whatsapp: false },
  internalNotes: 'butuh bantuan saat check-in',
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
} as unknown as NonNullable<MyProfileRow['profile']>

describe('serializeMyProfile', () => {
  it('tidak pernah mengirim hash password maupun catatan internal CRM', () => {
    const serialized = serializeMyProfile({ user, profile })

    expect(JSON.stringify(serialized)).not.toContain('argon2id')
    expect(JSON.stringify(serialized)).not.toContain('check-in')
    expect(serialized.profile?.referral_code).toBe('PRF001')
    expect(serialized.email_verified_at).toBe('2026-08-01T02:00:00.000Z')
  })

  it('membalas profile null untuk akun tanpa baris customer_profiles', () => {
    expect(serializeMyProfile({ user, profile: null }).profile).toBeNull()
  })
})

describe('normalizeNotificationPrefs', () => {
  it('mengisi kanal yang hilang dengan default docs/03 § 5', () => {
    expect(normalizeNotificationPrefs({ email: false })).toEqual({
      push: true,
      email: false,
      whatsapp: false,
    })
  })

  it('mengabaikan bentuk jsonb yang bukan objek', () => {
    expect(normalizeNotificationPrefs(null)).toEqual({ push: true, email: true, whatsapp: false })
    expect(normalizeNotificationPrefs(['email'])).toEqual({
      push: true,
      email: true,
      whatsapp: false,
    })
  })
})
