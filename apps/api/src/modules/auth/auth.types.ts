import type { UserRole, UserStatus } from '@hola/shared'

/** Context auth yang tersedia untuk service, serializer, dan middleware. */
export interface Viewer {
  userId: string
  role: UserRole
  cafeTenantId: string | undefined
  employeeId: string | undefined
}

/** Bentuk context yang dicache singkat di Redis; bukan sumber kebenaran. */
export interface AuthenticatedUserContext extends Viewer {
  status: UserStatus
  tokenVersion: number
}

export interface AccessTokenClaims {
  userId: string
  role: UserRole
  tokenVersion: number
  jti: string
  issuedAt: Date
  expiresAt: Date
}
