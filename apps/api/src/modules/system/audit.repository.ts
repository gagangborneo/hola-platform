/** Penulis audit append-only yang dipakai service lintas modul. */
import { auditLogs, type HolaDb } from '@hola/db'
import type { UserRole } from '@hola/shared'
import type { Tx } from '../../lib/transaction.ts'

type DbExecutor = HolaDb | Tx

export interface AuditEntry {
  actorUserId: string | undefined
  actorRole: UserRole | undefined
  action: string
  entityType: string
  entityId: string | undefined
  before: unknown
  after: unknown
  ipAddress: string | undefined
  userAgent: string | undefined
  requestId: string | undefined
}

/** `audit_logs` tidak pernah di-update atau dihapus oleh aplikasi. */
export async function writeAuditLog(db: DbExecutor, entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    ...(entry.actorUserId ? { actorUserId: entry.actorUserId } : {}),
    ...(entry.actorRole ? { actorRole: entry.actorRole } : {}),
    action: entry.action,
    entityType: entry.entityType,
    ...(entry.entityId ? { entityId: entry.entityId } : {}),
    ...(entry.before === undefined ? {} : { before: entry.before }),
    ...(entry.after === undefined ? {} : { after: entry.after }),
    ...(entry.ipAddress ? { ipAddress: entry.ipAddress } : {}),
    ...(entry.userAgent ? { userAgent: entry.userAgent } : {}),
    ...(entry.requestId ? { requestId: entry.requestId } : {}),
  })
}
