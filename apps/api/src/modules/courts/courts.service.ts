import { ERROR_CODE, witaDateYmd, witaToInstant } from '@hola/shared'
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
  type CourtDetail,
  type CourtRow,
  createCourt,
  findCourt,
  findCourtDetail,
  findReadyCourtPhotos,
  hasFutureActiveClaims,
  listPublicCourts,
  type PublicCourtFilter,
  patchCourt,
  replaceCourtOperatingHours,
  replaceCourtPhotos,
} from './courts.repository.ts'
import type {
  CreateCourtInput,
  PatchCourtInput,
  ReplaceCourtPhotosInput,
  ReplaceOperatingHoursInput,
} from './courts.schema.ts'

export interface CourtsServiceContext
  extends Pick<CoreDependencies, 'db' | 'redis' | 'redisKeys' | 'safeRedis' | 'logger' | 'queues'> {
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
  try {
    return await withTransaction(
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
  } catch (error) {
    if (error instanceof UniqueViolationError) throw err.conflict('Kode lapangan sudah digunakan.')
    throw error
  }
}

export async function patchAdminCourt(
  ctx: CourtsServiceContext,
  input: { courtId: string; version: number; patch: PatchCourtInput },
): Promise<CourtRow> {
  const before = await findCourt(ctx.db, input.courtId)
  if (!before) throw err.notFound('Lapangan tidak ditemukan.')
  const nextMinSlots = input.patch.min_slots_per_booking ?? before.minSlotsPerBooking
  const nextMaxSlots = input.patch.max_slots_per_booking ?? before.maxSlotsPerBooking
  if (nextMinSlots > nextMaxSlots) {
    throw err.validation(
      { field: 'min_slots_per_booking' },
      'min_slots_per_booking tidak boleh melebihi max_slots_per_booking.',
    )
  }
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

export async function replaceAdminCourtPhotos(
  ctx: CourtsServiceContext,
  courtId: string,
  input: ReplaceCourtPhotosInput,
): Promise<void> {
  if (!(await findCourt(ctx.db, courtId))) throw err.notFound('Lapangan tidak ditemukan.')
  const media = await findReadyCourtPhotos(ctx.db, input.media_ids)
  const validMedia =
    media.length === input.media_ids.length &&
    media.every((item) => item.kind === 'court_photo' && item.status === 'ready')
  if (!validMedia) {
    throw err.validation(
      { field: 'media_ids' },
      'Setiap foto harus berupa media court_photo yang sudah siap digunakan.',
    )
  }
  await withTransaction(
    ctx.db,
    async ({ tx }) => {
      await replaceCourtPhotos(tx, { courtId, mediaIds: input.media_ids })
      await writeAuditLog(tx, {
        ...audit(ctx),
        action: 'court.photos_replace',
        entityType: 'court',
        entityId: courtId,
        before: undefined,
        after: { media_ids: input.media_ids },
      })
    },
    { logger: ctx.logger },
  )
}

export async function listCourts(
  ctx: Pick<CourtsServiceContext, 'db'>,
  filter: PublicCourtFilter,
): Promise<CourtRow[]> {
  return listPublicCourts(ctx.db, filter)
}

export async function getCourtDetail(
  ctx: Pick<CourtsServiceContext, 'db'>,
  courtId: string,
): Promise<CourtDetail> {
  const detail = await findCourtDetail(ctx.db, courtId)
  if (!detail) throw err.notFound('Lapangan tidak ditemukan.')
  return detail
}
