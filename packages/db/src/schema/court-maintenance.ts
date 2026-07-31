/**
 * Penutupan lapangan terjadwal.
 * Sumber kebenaran: docs/03-DATA-MODEL.md § 6.
 */
import { pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { pkId, timestamps, tstz } from '../columns.ts'
import { users } from './identity.ts'
import { courts } from './venue.ts'

/**
 * Satu maintenance membuat satu atau lebih `slot_claims` bertipe `maintenance`.
 * Pembatalan tidak menghapus riwayat maintenance maupun klaimnya.
 */
export const courtMaintenances = pgTable('court_maintenances', {
  id: pkId(),
  courtId: uuid('court_id')
    .notNull()
    .references(() => courts.id),
  startsAt: tstz('starts_at').notNull(),
  endsAt: tstz('ends_at').notNull(),
  reason: text('reason').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  cancelledAt: tstz('cancelled_at'),
  ...timestamps,
})
