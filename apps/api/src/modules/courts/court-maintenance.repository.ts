import { courtMaintenances, type HolaDb } from '@hola/db'
import { and, count, eq, isNull, type SQL } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'
import type { CourtMaintenancesQuery } from './court-maintenance.schema.ts'

type DbExecutor = HolaDb | Tx
export type CourtMaintenanceRow = typeof courtMaintenances.$inferSelect

function filters(query: CourtMaintenancesQuery): SQL[] {
  return [
    ...(query.court_id ? [eq(courtMaintenances.courtId, query.court_id)] : []),
    ...(query.active_only ? [isNull(courtMaintenances.cancelledAt)] : []),
  ]
}

export async function createCourtMaintenance(
  tx: Tx,
  input: { courtId: string; startsAt: Date; endsAt: Date; reason: string; createdByUserId: string },
): Promise<CourtMaintenanceRow> {
  const [row] = await tx.insert(courtMaintenances).values(input).returning()
  if (!row) throw new Error('court_maintenances gagal dibuat')
  return row
}

export async function findCourtMaintenance(
  db: DbExecutor,
  id: string,
): Promise<CourtMaintenanceRow | null> {
  const [row] = await db
    .select()
    .from(courtMaintenances)
    .where(eq(courtMaintenances.id, id))
    .limit(1)
  return row ?? null
}

export async function cancelCourtMaintenance(
  tx: Tx,
  input: { id: string; now: Date },
): Promise<CourtMaintenanceRow | null> {
  const [row] = await tx
    .update(courtMaintenances)
    .set({ cancelledAt: input.now })
    .where(and(eq(courtMaintenances.id, input.id), isNull(courtMaintenances.cancelledAt)))
    .returning()
  return row ?? null
}

export async function listCourtMaintenances(
  db: HolaDb,
  query: CourtMaintenancesQuery,
): Promise<CourtMaintenanceRow[]> {
  return db
    .select()
    .from(courtMaintenances)
    .where(and(...filters(query)))
    .orderBy(courtMaintenances.startsAt, courtMaintenances.id)
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
}

export async function countCourtMaintenances(
  db: HolaDb,
  query: CourtMaintenancesQuery,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(courtMaintenances)
    .where(and(...filters(query)))
  return row?.value ?? 0
}
