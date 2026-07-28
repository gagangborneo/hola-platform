/** Query identity/auth. Business rule tetap berada di auth.service.ts. */
import { customerProfiles, type HolaDb, passwordResetTokens, refreshTokens, users } from '@hola/db'
import {
  LOGIN_LOCKOUT_MINUTES,
  LOGIN_MAX_FAILED_ATTEMPTS,
  type UserRole,
  type UserStatus,
} from '@hola/shared'
import { and, asc, desc, eq, gt, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { translateDbError } from '../../lib/errors.ts'
import type { Tx } from '../../lib/transaction.ts'

type DbExecutor = HolaDb | Tx
export type IdentityUser = typeof users.$inferSelect
export type RefreshToken = typeof refreshTokens.$inferSelect

async function translate<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw translateDbError(error)
  }
}

export async function findUserByIdentifier(
  db: DbExecutor,
  identifier: string,
): Promise<IdentityUser | null> {
  const normalized = identifier.trim().toLowerCase()
  const [user] = await db
    .select()
    .from(users)
    .where(
      or(eq(sql<string>`lower(${users.email})`, normalized), eq(users.phone, identifier.trim())),
    )
    .limit(1)
  return user ?? null
}

export async function findUserByEmail(db: DbExecutor, email: string): Promise<IdentityUser | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(sql<string>`lower(${users.email})`, email.trim().toLowerCase()))
    .limit(1)
  return user ?? null
}

export async function findUserById(db: DbExecutor, id: string): Promise<IdentityUser | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return user ?? null
}

export async function createUser(
  db: DbExecutor,
  input: {
    role: UserRole
    email: string | undefined
    phone: string | undefined
    passwordHash: string
    fullName: string
  },
): Promise<IdentityUser> {
  return translate(async () => {
    const [user] = await db
      .insert(users)
      .values({
        role: input.role,
        ...(input.email ? { email: input.email } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        passwordHash: input.passwordHash,
        fullName: input.fullName,
      })
      .returning()
    if (!user) throw new Error('INSERT users tidak mengembalikan baris')
    return user
  })
}

export async function createCustomerProfile(
  db: DbExecutor,
  input: { userId: string; referralCode: string },
): Promise<void> {
  await translate(async () => {
    await db.insert(customerProfiles).values(input)
  })
}

export async function resetSuccessfulLogin(
  db: DbExecutor,
  userId: string,
  now: Date,
): Promise<void> {
  await db
    .update(users)
    .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: now, updatedAt: now })
    .where(eq(users.id, userId))
}

/** Atomik agar dua percobaan paralel tidak dapat melewati batas lockout. */
export async function recordFailedLogin(
  db: DbExecutor,
  userId: string,
): Promise<{ failedLoginCount: number; lockedUntil: Date | null } | null> {
  const resetAfterExpiredLock = sql<number>`CASE
    WHEN ${users.lockedUntil} IS NOT NULL AND ${users.lockedUntil} <= now() THEN 1
    ELSE ${users.failedLoginCount} + 1
  END`
  const [updated] = await db
    .update(users)
    .set({
      failedLoginCount: resetAfterExpiredLock,
      lockedUntil: sql<Date | null>`CASE
        WHEN ${resetAfterExpiredLock} >= ${LOGIN_MAX_FAILED_ATTEMPTS}
          THEN now() + make_interval(mins => ${LOGIN_LOCKOUT_MINUTES})
        ELSE NULL
      END`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ failedLoginCount: users.failedLoginCount, lockedUntil: users.lockedUntil })
  return updated ?? null
}

export async function updatePassword(
  db: DbExecutor,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId))
}

export async function updateEmailVerification(
  db: DbExecutor,
  userId: string,
  now: Date,
): Promise<void> {
  await db.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, userId))
}

export async function createRefreshToken(
  db: DbExecutor,
  input: {
    userId: string
    tokenHash: string
    familyId: string | undefined
    parentId: string | undefined
    deviceLabel: string | undefined
    ipAddress: string | undefined
    userAgent: string | undefined
    expiresAt: Date
    now: Date
  },
): Promise<RefreshToken> {
  return translate(async () => {
    const [token] = await db
      .insert(refreshTokens)
      .values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        ...(input.familyId ? { familyId: input.familyId } : {}),
        ...(input.parentId ? { parentId: input.parentId } : {}),
        ...(input.deviceLabel ? { deviceLabel: input.deviceLabel } : {}),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        expiresAt: input.expiresAt,
        lastUsedAt: input.now,
      })
      .returning()
    if (!token) throw new Error('INSERT refresh_tokens tidak mengembalikan baris')
    return token
  })
}

export async function findRefreshTokenByHash(
  db: DbExecutor,
  tokenHash: string,
): Promise<RefreshToken | null> {
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1)
  return token ?? null
}

export async function revokeRefreshForRotation(
  db: DbExecutor,
  tokenId: string,
  now: Date,
): Promise<boolean> {
  const [updated] = await db
    .update(refreshTokens)
    .set({ revokedAt: now, revokedReason: 'rotated', lastUsedAt: now })
    .where(and(eq(refreshTokens.id, tokenId), isNull(refreshTokens.revokedAt)))
    .returning({ id: refreshTokens.id })
  return updated !== undefined
}

export async function revokeRefreshToken(
  db: DbExecutor,
  input: { tokenId: string; userId: string; reason: string; now: Date },
): Promise<boolean> {
  const [updated] = await db
    .update(refreshTokens)
    .set({ revokedAt: input.now, revokedReason: input.reason, lastUsedAt: input.now })
    .where(
      and(
        eq(refreshTokens.id, input.tokenId),
        eq(refreshTokens.userId, input.userId),
        isNull(refreshTokens.revokedAt),
      ),
    )
    .returning({ id: refreshTokens.id })
  return updated !== undefined
}

export async function revokeRefreshFamily(
  db: DbExecutor,
  familyId: string,
  now: Date,
): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: now, revokedReason: 'reuse_detected' })
    .where(eq(refreshTokens.familyId, familyId))
}

export async function revokeAllRefreshTokens(
  db: DbExecutor,
  input: { userId: string; reason: string; now: Date; exceptTokenId: string | undefined },
): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: input.now, revokedReason: input.reason, lastUsedAt: input.now })
    .where(
      and(
        eq(refreshTokens.userId, input.userId),
        isNull(refreshTokens.revokedAt),
        ...(input.exceptTokenId ? [ne(refreshTokens.id, input.exceptTokenId)] : []),
      ),
    )
}

export async function incrementTokenVersion(db: DbExecutor, userId: string): Promise<void> {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId))
}

export async function listActiveRefreshTokens(
  db: DbExecutor,
  userId: string,
  now: Date,
): Promise<RefreshToken[]> {
  return db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, now),
      ),
    )
    .orderBy(asc(refreshTokens.lastUsedAt), asc(refreshTokens.createdAt))
}

export async function revokeRefreshTokensById(
  db: DbExecutor,
  input: { ids: readonly string[]; reason: string; now: Date },
): Promise<void> {
  if (input.ids.length === 0) return
  await db
    .update(refreshTokens)
    .set({ revokedAt: input.now, revokedReason: input.reason, lastUsedAt: input.now })
    .where(inArray(refreshTokens.id, [...input.ids]))
}

export async function createPasswordResetToken(
  db: DbExecutor,
  input: { userId: string; tokenHash: string; expiresAt: Date; ipAddress: string | undefined },
): Promise<void> {
  await translate(async () => {
    await db.insert(passwordResetTokens).values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    })
  })
}

export async function findPasswordResetToken(
  db: DbExecutor,
  tokenHash: string,
): Promise<typeof passwordResetTokens.$inferSelect | null> {
  const [token] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1)
  return token ?? null
}

/** Claim sekali pakai dilakukan UPDATE bersyarat agar race tidak dapat reset dua kali. */
export async function consumePasswordResetToken(
  db: DbExecutor,
  tokenId: string,
  now: Date,
): Promise<boolean> {
  const [updated] = await db
    .update(passwordResetTokens)
    .set({ consumedAt: now })
    .where(
      and(
        eq(passwordResetTokens.id, tokenId),
        isNull(passwordResetTokens.consumedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .returning({ id: passwordResetTokens.id })
  return updated !== undefined
}

export async function listUsers(
  db: DbExecutor,
  input: {
    role: UserRole | undefined
    status: UserStatus | undefined
    q: string | undefined
    limit: number
    offset: number
  },
): Promise<IdentityUser[]> {
  const filters = [
    ...(input.role ? [eq(users.role, input.role)] : []),
    ...(input.status ? [eq(users.status, input.status)] : []),
    ...(input.q
      ? [
          or(
            ilike(users.fullName, `%${input.q}%`),
            ilike(users.email, `%${input.q}%`),
            ilike(users.phone, `%${input.q}%`),
          ),
        ]
      : []),
  ]
  return db
    .select()
    .from(users)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(input.limit)
    .offset(input.offset)
}

export async function countUsers(
  db: DbExecutor,
  input: { role: UserRole | undefined; status: UserStatus | undefined; q: string | undefined },
): Promise<number> {
  const filters = [
    ...(input.role ? [eq(users.role, input.role)] : []),
    ...(input.status ? [eq(users.status, input.status)] : []),
    ...(input.q
      ? [
          or(
            ilike(users.fullName, `%${input.q}%`),
            ilike(users.email, `%${input.q}%`),
            ilike(users.phone, `%${input.q}%`),
          ),
        ]
      : []),
  ]
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(filters.length > 0 ? and(...filters) : undefined)
  return result?.count ?? 0
}

export async function updateUserRoleOrStatus(
  db: DbExecutor,
  input: { userId: string; role: UserRole | undefined; status: UserStatus | undefined },
): Promise<IdentityUser | null> {
  const [updated] = await db
    .update(users)
    .set({
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {}),
      tokenVersion: sql`${users.tokenVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.userId))
    .returning()
  return updated ?? null
}
