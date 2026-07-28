/** Business rule pengelolaan user oleh admin. */
import type { AdminCreateUserInput, AdminPatchUserInput, AdminUsersQuery } from '@hola/shared'
import { err, UniqueViolationError } from '../../lib/errors.ts'
import { withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import {
  countUsers,
  createUser,
  findUserById,
  type IdentityUser,
  incrementTokenVersion,
  listUsers,
  revokeAllRefreshTokens,
  updateUserRoleOrStatus,
} from '../auth/auth.repository.ts'
import { invalidateUserContext } from '../auth/auth.service.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { assertPasswordAllowed, hashPassword } from '../auth/password.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import { serializeAdminUser } from './admin-users.serializer.ts'

type AdminDependencies = Pick<
  CoreDependencies,
  'db' | 'env' | 'logger' | 'mail' | 'redis' | 'redisKeys' | 'safeRedis'
>

export interface AdminServiceContext extends AdminDependencies {
  now: Date
  actor: Viewer
  requestId: string | undefined
  ipAddress: string | undefined
  userAgent: string | undefined
}

function auditContext(ctx: AdminServiceContext) {
  return {
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  }
}

export async function listAdminUsers(
  ctx: AdminServiceContext,
  query: AdminUsersQuery,
): Promise<{ users: IdentityUser[]; totalCount: number }> {
  const [rows, totalCount] = await Promise.all([
    listUsers(ctx.db, {
      role: query.role,
      status: query.status,
      q: query.q,
      limit: query.per_page,
      offset: (query.page - 1) * query.per_page,
    }),
    countUsers(ctx.db, { role: query.role, status: query.status, q: query.q }),
  ])
  return { users: rows, totalCount }
}

export async function createAdminUser(
  ctx: AdminServiceContext,
  input: AdminCreateUserInput,
): Promise<IdentityUser> {
  assertPasswordAllowed({ password: input.password, email: input.email, fullName: input.full_name })
  const passwordHash = await hashPassword(input.password, ctx.env)
  try {
    return await withTransaction(ctx.db, async ({ tx }) => {
      const user = await createUser(tx, {
        role: input.role,
        email: input.email,
        phone: input.phone,
        passwordHash,
        fullName: input.full_name,
      })
      await writeAuditLog(tx, {
        ...auditContext(ctx),
        action: 'admin.user_create',
        entityType: 'user',
        entityId: user.id,
        before: undefined,
        after: serializeAdminUser(user),
      })
      return user
    })
  } catch (error) {
    if (error instanceof UniqueViolationError)
      throw err.conflict('Email atau nomor HP sudah digunakan.')
    throw error
  }
}

export async function patchAdminUser(
  ctx: AdminServiceContext,
  userId: string,
  input: AdminPatchUserInput,
): Promise<IdentityUser> {
  const before = await findUserById(ctx.db, userId)
  if (!before) throw err.notFound()
  const nextRole = input.role ?? before.role
  const nextStatus = input.status ?? before.status
  if (nextRole === before.role && nextStatus === before.status) return before

  const updated = await withTransaction(ctx.db, async ({ tx, afterCommit }) => {
    const user = await updateUserRoleOrStatus(tx, {
      userId,
      role: input.role,
      status: input.status,
    })
    if (!user) throw err.notFound()
    await revokeAllRefreshTokens(tx, {
      userId,
      reason: 'admin_revoke',
      now: ctx.now,
      exceptTokenId: undefined,
    })
    await writeAuditLog(tx, {
      ...auditContext(ctx),
      action: 'admin.user_update',
      entityType: 'user',
      entityId: userId,
      before: serializeAdminUser(before),
      after: serializeAdminUser(user),
    })
    afterCommit(() => invalidateUserContext(ctx, userId))
    return user
  })
  return updated
}

export async function revokeAdminUserSessions(
  ctx: AdminServiceContext,
  userId: string,
): Promise<void> {
  const user = await findUserById(ctx.db, userId)
  if (!user) throw err.notFound()
  await withTransaction(ctx.db, async ({ tx, afterCommit }) => {
    await incrementTokenVersion(tx, userId)
    await revokeAllRefreshTokens(tx, {
      userId,
      reason: 'admin_revoke',
      now: ctx.now,
      exceptTokenId: undefined,
    })
    await writeAuditLog(tx, {
      ...auditContext(ctx),
      action: 'admin.user_revoke_sessions',
      entityType: 'user',
      entityId: userId,
      before: undefined,
      after: undefined,
    })
    afterCommit(() => invalidateUserContext(ctx, userId))
  })
}
