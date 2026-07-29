/** Query Drizzle untuk pengaturan dan audit log yang hanya dapat dibaca admin. */
import { appSettings, auditLogs, type HolaDb } from '@hola/db'
import type { AdminAuditLogsQuery, SettingsKey } from '@hola/shared'
import { and, asc, desc, eq, gte, lte, type SQL, sql } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'

type DbExecutor = HolaDb | Tx

export type AppSetting = typeof appSettings.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect

export interface AdminAuditFilters {
  action: string | undefined
  actorUserId: string | undefined
  createdAtFrom: string | undefined
  createdAtTo: string | undefined
  entityId: string | undefined
  entityType: string | undefined
}

function auditWhere(input: AdminAuditFilters): SQL | undefined {
  const filters = [
    ...(input.entityType ? [eq(auditLogs.entityType, input.entityType)] : []),
    ...(input.entityId ? [eq(auditLogs.entityId, input.entityId)] : []),
    ...(input.actorUserId ? [eq(auditLogs.actorUserId, input.actorUserId)] : []),
    ...(input.action ? [eq(auditLogs.action, input.action)] : []),
    ...(input.createdAtFrom ? [gte(auditLogs.createdAt, new Date(input.createdAtFrom))] : []),
    ...(input.createdAtTo ? [lte(auditLogs.createdAt, new Date(input.createdAtTo))] : []),
  ]
  return filters.length > 0 ? and(...filters) : undefined
}

function auditOrderBy(sort: AdminAuditLogsQuery['sort']): [SQL, SQL] {
  switch (sort) {
    case 'created_at':
      return [asc(auditLogs.createdAt), asc(auditLogs.id)]
    case '-created_at':
      return [desc(auditLogs.createdAt), desc(auditLogs.id)]
    case 'action':
      return [asc(auditLogs.action), asc(auditLogs.id)]
    case '-action':
      return [desc(auditLogs.action), desc(auditLogs.id)]
    case 'entity_type':
      return [asc(auditLogs.entityType), asc(auditLogs.id)]
    case '-entity_type':
      return [desc(auditLogs.entityType), desc(auditLogs.id)]
  }
}

export async function findAdminSettings(db: HolaDb): Promise<AppSetting[]> {
  return db.select().from(appSettings).orderBy(asc(appSettings.key))
}

export async function findAdminSetting(
  db: DbExecutor,
  key: SettingsKey,
): Promise<AppSetting | null> {
  const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1)
  return setting ?? null
}

/** Upsert membuat kunci kanonik tetap dapat dikelola sebelum seed pertama dijalankan. */
export async function upsertAdminSetting(
  db: DbExecutor,
  input: { key: SettingsKey; value: unknown; updatedByUserId: string; now: Date },
): Promise<AppSetting> {
  const [setting] = await db
    .insert(appSettings)
    .values({
      key: input.key,
      value: input.value,
      updatedByUserId: input.updatedByUserId,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: input.value,
        updatedByUserId: input.updatedByUserId,
        updatedAt: input.now,
      },
    })
    .returning()
  if (!setting) throw new Error('UPSERT app_settings tidak mengembalikan baris')
  return setting
}

export async function listAdminAuditLogs(
  db: HolaDb,
  query: AdminAuditLogsQuery,
): Promise<AuditLog[]> {
  const where = auditWhere({
    entityType: query.entity_type,
    entityId: query.entity_id,
    actorUserId: query.actor_user_id,
    action: query.action,
    createdAtFrom: query.created_at_from,
    createdAtTo: query.created_at_to,
  })
  return db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(...auditOrderBy(query.sort))
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
}

export async function countAdminAuditLogs(db: HolaDb, query: AdminAuditLogsQuery): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(
      auditWhere({
        entityType: query.entity_type,
        entityId: query.entity_id,
        actorUserId: query.actor_user_id,
        action: query.action,
        createdAtFrom: query.created_at_from,
        createdAtTo: query.created_at_to,
      }),
    )
  return result?.count ?? 0
}
