/** Tidak pernah mengembalikan alamat email, error provider, atau payload sensitif. */
import type { NotificationRow } from './notification.repository.ts'

export function serializeInboxNotification(notification: NotificationRow): {
  id: string
  template_code: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
  related_type: string | null
  related_id: string | null
} {
  return {
    id: notification.id,
    template_code: notification.templateCode,
    // Payload F0 berisi metadata aman saja; tidak pernah token reset/verifikasi.
    payload:
      typeof notification.payload === 'object' && notification.payload !== null
        ? (notification.payload as Record<string, unknown>)
        : {},
    read_at: notification.readAt?.toISOString() ?? null,
    created_at: notification.createdAt.toISOString(),
    related_type: notification.relatedType,
    related_id: notification.relatedId,
  }
}
