/** Finance outbox Phase 1. Pemroses jurnal dibuat pada Phase 2. */
import { index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { pkId, timestamps, tstz } from '../columns.ts'
import { financeSourceTypeEnum, outboxStatusEnum } from './enums.ts'

/**
 * Outbox durabel untuk jurnal. Baris baru sengaja tetap `pending` sampai J-28
 * tersedia di Phase 2 (ROADMAP A-2).
 */
export const financeEvents = pgTable(
  'finance_events',
  {
    id: pkId(),
    sourceType: financeSourceTypeEnum('source_type').notNull(),
    sourceId: uuid('source_id').notNull(),
    kind: text('kind').notNull(),
    payload: jsonb('payload').notNull(),
    status: outboxStatusEnum('status').notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    lastError: text('last_error'),
    processedAt: tstz('processed_at'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('uq_finance_events_source_kind').on(t.sourceType, t.sourceId, t.kind),
    index('idx_finance_events_status_created').on(t.status, t.createdAt),
  ],
)
