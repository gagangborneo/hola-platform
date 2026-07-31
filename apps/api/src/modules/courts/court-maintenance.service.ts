import { err } from '../../lib/errors.ts'
import { withTransaction } from '../../lib/transaction.ts'
import {
  claimDirectSlotsInTransaction,
  releaseMaintenanceSlotsInTransaction,
} from '../slots/slots.service.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import {
  type CourtMaintenanceRow,
  cancelCourtMaintenance,
  countCourtMaintenances,
  createCourtMaintenance,
  findCourtMaintenance,
  listCourtMaintenances,
} from './court-maintenance.repository.ts'
import type {
  CourtMaintenancesQuery,
  CreateCourtMaintenanceInput,
} from './court-maintenance.schema.ts'
import { findCourt } from './courts.repository.ts'
import type { CourtsServiceContext } from './courts.service.ts'

function audit(ctx: CourtsServiceContext) {
  return {
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  }
}

function startsAtList(startsAt: Date, endsAt: Date, durationMinutes: number): Date[] {
  const starts: Date[] = []
  const durationMs = durationMinutes * 60_000
  for (let time = startsAt.getTime(); time < endsAt.getTime(); time += durationMs) {
    starts.push(new Date(time))
  }
  const last = starts.at(-1)
  if (!last || last.getTime() + durationMs !== endsAt.getTime()) {
    throw err.validation({ field: 'ends_at' }, 'Rentang maintenance harus tepat pada batas slot.')
  }
  return starts
}

export async function createAdminCourtMaintenance(
  ctx: CourtsServiceContext,
  input: CreateCourtMaintenanceInput,
): Promise<CourtMaintenanceRow> {
  if (input.force) {
    if (ctx.actor.role !== 'admin') throw err.forbidden()
    if (input.confirm !== true) throw err.validation({ field: 'confirm' })
    throw err.featureDisabled(
      'Force release akan tersedia setelah booking dan refund selesai dibangun.',
    )
  }
  const court = await findCourt(ctx.db, input.court_id)
  if (!court) throw err.notFound('Lapangan tidak ditemukan.')
  const startsAt = new Date(input.starts_at)
  const endsAt = new Date(input.ends_at)
  const slots = startsAtList(startsAt, endsAt, court.slotDurationMinutes)
  return withTransaction(
    ctx.db,
    async (scope) => {
      const maintenance = await createCourtMaintenance(scope.tx, {
        courtId: input.court_id,
        startsAt,
        endsAt,
        reason: input.reason,
        createdByUserId: ctx.actor.userId,
      })
      await claimDirectSlotsInTransaction(
        ctx,
        {
          courtId: input.court_id,
          startsAtList: slots,
          claimType: 'maintenance',
          owner: { kind: 'maintenance', courtMaintenanceId: maintenance.id },
          mode: 'direct',
          actor: ctx.actor,
        },
        scope,
      )
      await writeAuditLog(scope.tx, {
        ...audit(ctx),
        action: 'court_maintenance.create',
        entityType: 'court_maintenance',
        entityId: maintenance.id,
        before: undefined,
        after: maintenance,
      })
      return maintenance
    },
    { logger: ctx.logger },
  )
}

export async function cancelAdminCourtMaintenance(
  ctx: CourtsServiceContext,
  id: string,
): Promise<void> {
  const before = await findCourtMaintenance(ctx.db, id)
  if (!before) throw err.notFound('Maintenance tidak ditemukan.')
  await withTransaction(
    ctx.db,
    async (scope) => {
      const cancelled = await cancelCourtMaintenance(scope.tx, { id, now: ctx.now })
      if (!cancelled) return
      await releaseMaintenanceSlotsInTransaction(ctx, id, scope)
      await writeAuditLog(scope.tx, {
        ...audit(ctx),
        action: 'court_maintenance.cancel',
        entityType: 'court_maintenance',
        entityId: id,
        before,
        after: cancelled,
      })
    },
    { logger: ctx.logger },
  )
}

export async function listAdminCourtMaintenances(
  ctx: CourtsServiceContext,
  query: CourtMaintenancesQuery,
): Promise<{ rows: CourtMaintenanceRow[]; totalCount: number }> {
  const [rows, totalCount] = await Promise.all([
    listCourtMaintenances(ctx.db, query),
    countCourtMaintenances(ctx.db, query),
  ])
  return { rows, totalCount }
}
