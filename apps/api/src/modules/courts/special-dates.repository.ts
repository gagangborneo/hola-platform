/** Query PostgreSQL kalender hari khusus. */
import { type HolaDb, specialDates } from '@hola/db'
import { asc, eq } from 'drizzle-orm'
import { translateDbError } from '../../lib/errors.ts'
import type { Tx } from '../../lib/transaction.ts'
import type { CreateSpecialDateInput } from './special-dates.schema.ts'

type DbExecutor = HolaDb | Tx
export type SpecialDateRow = typeof specialDates.$inferSelect

export async function listSpecialDates(db: HolaDb): Promise<SpecialDateRow[]> {
  return db.select().from(specialDates).orderBy(asc(specialDates.date), asc(specialDates.id))
}

export async function findSpecialDate(db: DbExecutor, id: string): Promise<SpecialDateRow | null> {
  const [row] = await db.select().from(specialDates).where(eq(specialDates.id, id)).limit(1)
  return row ?? null
}

export async function createSpecialDate(
  tx: Tx,
  input: CreateSpecialDateInput,
): Promise<SpecialDateRow> {
  try {
    const [row] = await tx
      .insert(specialDates)
      .values({
        date: input.date,
        name: input.name,
        dayTypeOverride: input.day_type_override ?? null,
        isClosed: input.is_closed,
      })
      .returning()
    if (!row) throw new Error('special_dates gagal dibuat')
    return row
  } catch (error) {
    throw translateDbError(error)
  }
}

export async function deleteSpecialDate(tx: Tx, id: string): Promise<boolean> {
  const [row] = await tx
    .delete(specialDates)
    .where(eq(specialDates.id, id))
    .returning({ id: specialDates.id })
  return row !== undefined
}
