import type { AppSetting, AuditLog } from './admin-system.repository.ts'

/** Bentuk respons eksplisit agar kolom internal baru tidak bocor otomatis. */
export function serializeAdminSetting(setting: AppSetting): {
  key: string
  value: unknown
  description: string | null
  updated_by_user_id: string | null
  updated_at: string
} {
  return {
    key: setting.key,
    value: setting.value,
    description: setting.description,
    updated_by_user_id: setting.updatedByUserId,
    updated_at: setting.updatedAt.toISOString(),
  }
}

/** Audit bersifat append-only; endpoint ini hanya memberi representasi baca admin. */
export function serializeAuditLog(log: AuditLog): {
  id: string
  actor_user_id: string | null
  actor_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  before: unknown
  after: unknown
  ip_address: string | null
  user_agent: string | null
  request_id: string | null
  created_at: string
} {
  return {
    id: log.id,
    actor_user_id: log.actorUserId,
    actor_role: log.actorRole,
    action: log.action,
    entity_type: log.entityType,
    entity_id: log.entityId,
    before: log.before,
    after: log.after,
    ip_address: log.ipAddress,
    user_agent: log.userAgent,
    request_id: log.requestId,
    created_at: log.createdAt.toISOString(),
  }
}
