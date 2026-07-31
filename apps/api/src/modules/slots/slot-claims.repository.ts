/** Query read-only klaim slot. Pembuatan/pelepasan tetap hanya lewat slots.service. */
import { type HolaDb, slotClaims } from '@hola/db'
import { and, count, eq, gte, lte, type SQL } from 'drizzle-orm'
import type { SlotClaimsQuery } from './slot-claims.schema.ts'

function filters(query: SlotClaimsQuery): SQL[] {
  return [
    ...(query.court_id ? [eq(slotClaims.courtId, query.court_id)] : []),
    ...(query.slot_date_from ? [gte(slotClaims.slotDate, query.slot_date_from)] : []),
    ...(query.slot_date_to ? [lte(slotClaims.slotDate, query.slot_date_to)] : []),
    ...(query.claim_type ? [eq(slotClaims.claimType, query.claim_type)] : []),
    ...(query.status ? [eq(slotClaims.status, query.status)] : []),
  ]
}

export type SlotClaimListRow = typeof slotClaims.$inferSelect

export async function listSlotClaims(
  db: HolaDb,
  query: SlotClaimsQuery,
): Promise<SlotClaimListRow[]> {
  return db
    .select()
    .from(slotClaims)
    .where(and(...filters(query)))
    .orderBy(slotClaims.slotDate, slotClaims.startsAt, slotClaims.id)
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
}

export async function countSlotClaims(db: HolaDb, query: SlotClaimsQuery): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(slotClaims)
    .where(and(...filters(query)))
  return result?.value ?? 0
}
