/** Service read-only klaim slot. */
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import { countSlotClaims, listSlotClaims, type SlotClaimListRow } from './slot-claims.repository.ts'
import type { SlotClaimsQuery } from './slot-claims.schema.ts'

export async function listAdminSlotClaims(
  db: CoreDependencies['db'],
  query: SlotClaimsQuery,
): Promise<{ rows: SlotClaimListRow[]; totalCount: number }> {
  const [rows, totalCount] = await Promise.all([
    listSlotClaims(db, query),
    countSlotClaims(db, query),
  ])
  return { rows, totalCount }
}
