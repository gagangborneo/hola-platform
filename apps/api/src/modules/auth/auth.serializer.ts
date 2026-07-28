import type { UserRole } from '@hola/shared'

/** Data user yang aman dikirim sesudah login; tidak pernah menyertakan hash/token. */
export interface AuthUserView {
  id: string
  role: UserRole
  email: string | null
  phone: string | null
  fullName: string
  avatarMediaId: string | null
  emailVerifiedAt: Date | null
}

export function serializeAuthenticatedUser(user: AuthUserView) {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    phone: user.phone,
    full_name: user.fullName,
    avatar_media_id: user.avatarMediaId,
    email_verified_at: user.emailVerifiedAt?.toISOString() ?? null,
  }
}

/** Session tidak pernah membocorkan hash token meskipun kepada pemiliknya. */
export function serializeSession(session: {
  id: string
  deviceLabel: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  lastUsedAt: Date | null
  expiresAt: Date
}) {
  return {
    id: session.id,
    device_label: session.deviceLabel,
    ip_address: session.ipAddress,
    user_agent: session.userAgent,
    created_at: session.createdAt.toISOString(),
    last_used_at: session.lastUsedAt?.toISOString() ?? null,
    expires_at: session.expiresAt.toISOString(),
  }
}
