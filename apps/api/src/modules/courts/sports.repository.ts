import { type HolaDb, sports } from '@hola/db'
import { asc, eq } from 'drizzle-orm'

export type SportRow = typeof sports.$inferSelect

/** Olahraga aktif untuk landing dan filter lapangan; urutan ditentukan admin. */
export async function listActiveSports(db: HolaDb): Promise<SportRow[]> {
  return db
    .select()
    .from(sports)
    .where(eq(sports.isActive, true))
    .orderBy(asc(sports.sortOrder), asc(sports.name))
}
