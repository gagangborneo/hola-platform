/**
 * Serializer `/me/*`: yang dikirim adalah profil PEMILIKNYA sendiri, jadi tidak
 * ada penyaringan per-role di sini — tetapi `internal_notes` (CRM, docs/13 § 2.1)
 * tetap tidak pernah ikut, karena catatan itu ditulis staff TENTANG customer dan
 * bukan miliknya untuk dibaca.
 */
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@hola/shared'
import type { CustomerProfile, MyProfileRow } from './profile.repository.ts'

/**
 * Kolom jsonb bebas bentuk: baris lama bisa saja hanya punya sebagian kanal.
 * Kanal yang hilang jatuh ke default docs/03 § 5, bukan `undefined` — client
 * merender switch, dan switch tanpa nilai tidak punya posisi yang benar.
 */
export function normalizeNotificationPrefs(value: unknown): NotificationPrefs {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return DEFAULT_NOTIFICATION_PREFS
  const record = value as Record<string, unknown>
  const channel = (key: keyof NotificationPrefs): boolean =>
    typeof record[key] === 'boolean' ? record[key] : DEFAULT_NOTIFICATION_PREFS[key]
  return { push: channel('push'), email: channel('email'), whatsapp: channel('whatsapp') }
}

function serializeCustomerProfileFields(profile: CustomerProfile) {
  return {
    birth_date: profile.birthDate,
    gender: profile.gender,
    skill_level: profile.skillLevel,
    preferred_sport_id: profile.preferredSportId,
    tier_code: profile.tierCode,
    lifetime_points: profile.lifetimePoints,
    referral_code: profile.referralCode,
    notification_prefs: normalizeNotificationPrefs(profile.notificationPrefs),
  }
}

/**
 * Identitas di akar memakai bentuk yang persis sama dengan `serializeAuthenticatedUser`
 * (respons login/refresh) supaya client tidak perlu dua pemeta untuk satu orang.
 */
export function serializeMyProfile(row: MyProfileRow) {
  return {
    id: row.user.id,
    role: row.user.role,
    email: row.user.email,
    phone: row.user.phone,
    full_name: row.user.fullName,
    avatar_media_id: row.user.avatarMediaId,
    email_verified_at: row.user.emailVerifiedAt?.toISOString() ?? null,
    phone_verified_at: row.user.phoneVerifiedAt?.toISOString() ?? null,
    created_at: row.user.createdAt.toISOString(),
    profile: row.profile ? serializeCustomerProfileFields(row.profile) : null,
  }
}
