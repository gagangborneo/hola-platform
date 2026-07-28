import type { IdentityUser } from '../auth/auth.repository.ts'

/** Daftar admin eksplisit; hash, lock counter, dan token_version tidak bocor. */
export function serializeAdminUser(user: IdentityUser) {
  return {
    id: user.id,
    role: user.role,
    status: user.status,
    email: user.email,
    phone: user.phone,
    full_name: user.fullName,
    avatar_media_id: user.avatarMediaId,
    email_verified_at: user.emailVerifiedAt?.toISOString() ?? null,
    phone_verified_at: user.phoneVerifiedAt?.toISOString() ?? null,
    last_login_at: user.lastLoginAt?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  }
}
