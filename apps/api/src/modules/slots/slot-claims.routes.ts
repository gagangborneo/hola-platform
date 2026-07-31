/** Route read-only kalender klaim slot. */
import { USER_ROLE } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { buildOffsetResponseMeta } from '../../lib/pagination.ts'
import { okList } from '../../lib/response.ts'
import { authenticate } from '../../middleware/authenticate.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { registerGuardedRoute, requireRole } from '../../middleware/require-role.ts'
import { slotClaimsQuerySchema } from './slot-claims.schema.ts'
import { listAdminSlotClaims } from './slot-claims.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables
const PREFIX = '/api/v1/slot-claims'

function validationHook(result: { success: boolean; error?: unknown }): void {
  if (!result.success) throw result.error
}

function serialize(row: Awaited<ReturnType<typeof listAdminSlotClaims>>['rows'][number]) {
  return {
    id: row.id,
    court_id: row.courtId,
    starts_at: row.startsAt.toISOString(),
    ends_at: row.endsAt.toISOString(),
    slot_date: row.slotDate,
    claim_type: row.claimType,
    status: row.status,
    hold_expires_at: row.holdExpiresAt?.toISOString() ?? null,
    booking_item_id: row.bookingItemId,
    court_maintenance_id: row.courtMaintenanceId,
    released_at: row.releasedAt?.toISOString() ?? null,
    release_reason: row.releaseReason,
    created_by_user_id: row.createdByUserId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  }
}

registerGuardedRoute('GET', PREFIX)

export const slotClaimsRoutes = new Hono<{ Variables: Variables }>().get(
  '/slot-claims',
  authenticate,
  requireRole([USER_ROLE.STAFF, USER_ROLE.ADMIN]),
  zValidator('query', slotClaimsQuerySchema, validationHook),
  async (c) => {
    const query = c.req.valid('query')
    const result = await listAdminSlotClaims(c.get('core').db, query)
    return c.json(
      okList(result.rows.map(serialize), buildOffsetResponseMeta(query, result.totalCount)),
    )
  },
)
