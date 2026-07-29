/** Kontrak endpoint sistem admin (docs/04 § 9.15). */
import { z } from 'zod'
import { SETTINGS_KEY } from '../constants/settings-keys.ts'
import { idSchema, isoDateTime, offsetPaginationQuery } from './common.ts'

const settingsKeyValues = Object.values(SETTINGS_KEY)

/** Hanya setting kanonik yang dapat diubah tanpa deploy. */
export const adminSettingKeyParam = z.object({ key: z.enum(settingsKeyValues) })

/** `jsonb` menerima seluruh nilai JSON, bukan nilai JavaScript arbitrer. */
export const adminUpdateSettingSchema = z.object({ value: z.json() })

/** Sort field diaudit dan di-allowlist, termasuk tie-breaker `id` di repository. */
export const adminAuditLogsQuerySchema = offsetPaginationQuery
  .extend({
    entity_type: z.string().trim().min(1).max(120).optional(),
    entity_id: z.string().trim().min(1).max(120).optional(),
    actor_user_id: idSchema.optional(),
    action: z.string().trim().min(1).max(160).optional(),
    created_at_from: isoDateTime.optional(),
    created_at_to: isoDateTime.optional(),
    sort: z
      .enum(['created_at', '-created_at', 'action', '-action', 'entity_type', '-entity_type'])
      .default('-created_at'),
  })
  .refine(
    (value) =>
      value.created_at_from === undefined ||
      value.created_at_to === undefined ||
      new Date(value.created_at_from) <= new Date(value.created_at_to),
    { message: '`created_at_to` tidak boleh sebelum `created_at_from`', path: ['created_at_to'] },
  )

export type AdminAuditLogsQuery = z.infer<typeof adminAuditLogsQuerySchema>
export type AdminUpdateSettingInput = z.infer<typeof adminUpdateSettingSchema>
