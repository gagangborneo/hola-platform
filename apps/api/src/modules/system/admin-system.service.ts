/** Orkestrasi sistem admin: perubahan setting dan pembacaan audit. */
import type { AdminAuditLogsQuery, AdminUpdateSettingInput, SettingsKey } from '@hola/shared'
import { withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  type AppSetting,
  type AuditLog,
  countAdminAuditLogs,
  findAdminSetting,
  findAdminSettings,
  listAdminAuditLogs,
  upsertAdminSetting,
} from './admin-system.repository.ts'
import { serializeAdminSetting } from './admin-system.serializer.ts'
import { writeAuditLog } from './audit.repository.ts'

type AdminSystemDependencies = Pick<CoreDependencies, 'db'>

export interface AdminSystemServiceContext extends AdminSystemDependencies {
  actor: Viewer
  ipAddress: string | undefined
  now: Date
  requestId: string | undefined
  userAgent: string | undefined
}

function auditContext(ctx: AdminSystemServiceContext): {
  actorUserId: string
  actorRole: Viewer['role']
  ipAddress: string | undefined
  requestId: string | undefined
  userAgent: string | undefined
} {
  return {
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    ipAddress: ctx.ipAddress,
    requestId: ctx.requestId,
    userAgent: ctx.userAgent,
  }
}

export async function listSettings(ctx: AdminSystemServiceContext): Promise<AppSetting[]> {
  return findAdminSettings(ctx.db)
}

export async function updateSetting(
  ctx: AdminSystemServiceContext,
  key: SettingsKey,
  input: AdminUpdateSettingInput,
): Promise<AppSetting> {
  return withTransaction(ctx.db, async ({ tx }) => {
    const before = await findAdminSetting(tx, key)
    const setting = await upsertAdminSetting(tx, {
      key,
      value: input.value,
      updatedByUserId: ctx.actor.userId,
      now: ctx.now,
    })
    await writeAuditLog(tx, {
      ...auditContext(ctx),
      action: 'admin.setting_update',
      entityType: 'app_setting',
      entityId: key,
      before: before ? serializeAdminSetting(before) : undefined,
      after: serializeAdminSetting(setting),
    })
    return setting
  })
}

export async function listAuditLogs(
  ctx: AdminSystemServiceContext,
  query: AdminAuditLogsQuery,
): Promise<{ logs: AuditLog[]; totalCount: number }> {
  const [logs, totalCount] = await Promise.all([
    listAdminAuditLogs(ctx.db, query),
    countAdminAuditLogs(ctx.db, query),
  ])
  return { logs, totalCount }
}
