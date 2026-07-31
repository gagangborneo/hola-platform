/** Business rule kalender hari khusus dan invalidasi I-10. */
import { err, UniqueViolationError } from '../../lib/errors.ts'
import { withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  availabilityPattern,
  invalidateAvailabilityPattern,
} from '../availability/availability-cache.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import {
  createSpecialDate,
  deleteSpecialDate,
  findSpecialDate,
  listSpecialDates,
  type SpecialDateRow,
} from './special-dates.repository.ts'
import type { CreateSpecialDateInput } from './special-dates.schema.ts'

export interface SpecialDatesServiceContext
  extends Pick<CoreDependencies, 'db' | 'redis' | 'redisKeys' | 'safeRedis' | 'logger'> {
  actor: Viewer
  requestId: string | undefined
  ipAddress: string | undefined
  userAgent: string | undefined
}

function audit(ctx: SpecialDatesServiceContext) {
  return {
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  }
}

function invalidateDate(ctx: SpecialDatesServiceContext, date: string): () => Promise<void> {
  return () => invalidateAvailabilityPattern(ctx, availabilityPattern(ctx.redisKeys, `*:${date}`))
}

export async function listPublicSpecialDates(
  db: CoreDependencies['db'],
): Promise<SpecialDateRow[]> {
  return listSpecialDates(db)
}

export async function createAdminSpecialDate(
  ctx: SpecialDatesServiceContext,
  input: CreateSpecialDateInput,
): Promise<SpecialDateRow> {
  try {
    return await withTransaction(ctx.db, async ({ tx, afterCommit }) => {
      const row = await createSpecialDate(tx, input)
      await writeAuditLog(tx, {
        ...audit(ctx),
        action: 'special_date.create',
        entityType: 'special_date',
        entityId: row.id,
        before: undefined,
        after: row,
      })
      afterCommit(invalidateDate(ctx, row.date))
      return row
    })
  } catch (error) {
    if (error instanceof UniqueViolationError) throw err.conflict('Tanggal khusus sudah ada.')
    throw error
  }
}

export async function deleteAdminSpecialDate(
  ctx: SpecialDatesServiceContext,
  id: string,
): Promise<void> {
  const before = await findSpecialDate(ctx.db, id)
  if (!before) throw err.notFound('Tanggal khusus tidak ditemukan.')
  await withTransaction(ctx.db, async ({ tx, afterCommit }) => {
    if (!(await deleteSpecialDate(tx, id))) throw err.notFound('Tanggal khusus tidak ditemukan.')
    await writeAuditLog(tx, {
      ...audit(ctx),
      action: 'special_date.delete',
      entityType: 'special_date',
      entityId: id,
      before,
      after: undefined,
    })
    afterCommit(invalidateDate(ctx, before.date))
  })
}
