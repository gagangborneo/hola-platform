import { TEMPLATE_CODE } from '@hola/shared'
import { err } from '../../lib/errors.ts'
import { withTransaction } from '../../lib/transaction.ts'
import { cancelBookingJobs } from '../bookings/booking-jobs.ts'
import { findBookingRecipient, forceCancelBookings } from '../bookings/bookings.repository.ts'
import {
  enqueueEmailNotification,
  writeEmailNotification,
} from '../notifications/notification.service.ts'
import { findPaidPaymentForBooking } from '../payments/payments.repository.ts'
import { releaseBookingPromo } from '../promos/promos.service.ts'
import { createRefundInScope } from '../refunds/refunds.service.ts'
import {
  claimDirectSlotsInTransaction,
  forceReleaseBookingConflictsInTransaction,
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
): Promise<CourtMaintenanceRow & { cancelledBookingIds: string[] }> {
  if (input.force) {
    if (ctx.actor.role !== 'admin') throw err.forbidden()
    if (input.confirm !== true) throw err.validation({ field: 'confirm' })
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
      const forced = input.force
        ? await forceReleaseBookingConflictsInTransaction(
            ctx,
            { courtId: input.court_id, startsAtList: slots },
            scope,
          )
        : { bookingIds: [], claimIds: [] }
      const cancelled = await forceCancelBookings(scope.tx, {
        bookingIds: forced.bookingIds,
        actorUserId: ctx.actor.userId,
        reason: input.reason,
        now: ctx.now,
      })
      for (const booking of cancelled) {
        scope.afterCommit(() => cancelBookingJobs(ctx, booking.id))
        const payment = await findPaidPaymentForBooking(scope.tx, booking.id)
        if (payment) {
          await createRefundInScope(ctx, scope, {
            paymentId: payment.id,
            amount: payment.amount,
            reason: input.reason,
            policyApplied: 'hola_fault_100pct',
            channel: payment.method === 'cash' ? 'cash' : 'manual_transfer',
            automatic: true,
            requestedByUserId: ctx.actor.userId,
          })
        }
        await releaseBookingPromo(ctx, booking.id, 'admin_force_release', scope)
        const recipient = await findBookingRecipient(scope.tx, booking.id)
        if (recipient?.email) {
          const notification = await writeEmailNotification(
            scope.tx,
            {
              userId: recipient.userId,
              toEmail: recipient.email,
              templateCode: TEMPLATE_CODE.BOOKING_FORCE_CANCELLED,
              dedupeKey: `booking:${booking.id}:force-cancelled`,
              relatedType: 'booking',
              relatedId: booking.id,
              payload: {
                full_name: recipient.fullName,
                booking_code: booking.bookingCode,
                reason: input.reason,
              },
            },
            ctx.now,
          )
          if (notification) scope.afterCommit(() => enqueueEmailNotification(ctx, notification.id))
        }
      }
      const claims = await claimDirectSlotsInTransaction(
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
        action: input.force ? 'slot.force_release' : 'court_maintenance.create',
        entityType: 'court_maintenance',
        entityId: maintenance.id,
        before: undefined,
        after: {
          maintenance,
          released_claim_ids: forced.claimIds,
          new_claim_ids: claims.map((claim) => claim.id),
          cancelled_booking_ids: cancelled.map((booking) => booking.id),
        },
      })
      return { ...maintenance, cancelledBookingIds: cancelled.map((booking) => booking.id) }
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
