import { ERROR_CODE, witaDateYmd, witaToInstant } from '@hola/shared'
import { err } from '../../lib/errors.ts'
import { withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  availabilityPattern,
  invalidateAvailabilityPattern,
} from '../availability/availability-cache.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import {
  type CourtRow,
  createCourt,
  findCourt,
  hasFutureActiveClaims,
  patchCourt,
  replaceCourtOperatingHours,
} from './courts.repository.ts'
import type {
  CreateCourtInput,
  PatchCourtInput,
  ReplaceOperatingHoursInput,
} from './courts.schema.ts'

export interface CourtsServiceContext
  extends Pick<CoreDependencies, 'db' | 'redis' | 'redisKeys' | 'safeRedis' | 'logger'> {
  now: Date
  actor: Viewer
  requestId: string | undefined
  ipAddress: string | undefined
  userAgent: string | undefined
}

function audit(ctx: CourtsServiceContext) {
  return {
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  }
}

export async function createAdminCourt(
  ctx: CourtsServiceContext,
  input: CreateCourtInput,
): Promise<CourtRow> {
  return withTransaction(
    ctx.db,
    async ({ tx, afterCommit }) => {
      const court = await createCourt(tx, input)
      await writeAuditLog(tx, {
        ...audit(ctx),
        action: 'court.create',
        entityType: 'court',
        entityId: court.id,
        before: undefined,
        after: court,
      })
      afterCommit(() =>
        invalidateAvailabilityPattern(ctx, availabilityPattern(ctx.redisKeys, `${court.id}:*`)),
      )
      return court
    },
    { logger: ctx.logger },
  )
}

export async function patchAdminCourt(
  ctx: CourtsServiceContext,
  input: { courtId: string; version: number | undefined; patch: PatchCourtInput },
): Promise<CourtRow> {
  const before = await findCourt(ctx.db, input.courtId)
  if (!before) throw err.notFound('Lapangan tidak ditemukan.')
  if (
    input.patch.slot_duration_minutes !== undefined &&
    input.patch.slot_duration_minutes !== before.slotDurationMinutes
  ) {
    const today = witaToInstant(witaDateYmd(ctx.now), 0)
    if (await hasFutureActiveClaims(ctx.db, input.courtId, today))
      throw err.of(ERROR_CODE.COURT_HAS_FUTURE_CLAIMS)
  }
  const updated = await withTransaction(
    ctx.db,
    async ({ tx, afterCommit }) => {
      const court = await patchCourt(tx, {
        id: input.courtId,
        version: input.version,
        patch: input.patch,
      })
      if (!court) {
        const current = await findCourt(tx, input.courtId)
        if (!current) throw err.notFound('Lapangan tidak ditemukan.')
        throw err.of(ERROR_CODE.PRECONDITION_FAILED, {
          details: { current_version: current.version },
        })
      }
      await writeAuditLog(tx, {
        ...audit(ctx),
        action: 'court.update',
        entityType: 'court',
        entityId: court.id,
        before,
        after: court,
      })
      afterCommit(() =>
        invalidateAvailabilityPattern(ctx, availabilityPattern(ctx.redisKeys, `${court.id}:*`)),
      )
      return court
    },
    { logger: ctx.logger },
  )
  return updated
}

export async function replaceAdminCourtOperatingHours(
  ctx: CourtsServiceContext,
  courtId: string,
  input: ReplaceOperatingHoursInput,
): Promise<void> {
  if (!(await findCourt(ctx.db, courtId))) throw err.notFound('Lapangan tidak ditemukan.')
  await withTransaction(
    ctx.db,
    async ({ tx, afterCommit }) => {
      await replaceCourtOperatingHours(tx, { courtId, hours: input.hours })
      await writeAuditLog(tx, {
        ...audit(ctx),
        action: 'court.operating_hours_replace',
        entityType: 'court',
        entityId: courtId,
        before: undefined,
        after: input.hours,
      })
      afterCommit(() =>
        invalidateAvailabilityPattern(ctx, availabilityPattern(ctx.redisKeys, `${courtId}:*`)),
      )
    },
    { logger: ctx.logger },
  )
}
