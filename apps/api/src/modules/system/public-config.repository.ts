import { appSettings, type HolaDb } from '@hola/db'
import { inArray } from 'drizzle-orm'

export interface PublicSettingRow {
  key: string
  value: unknown
}

/** Query terbatas ke allowlist; setting internal tidak pernah ikut terbaca. */
export async function findPublicSettings(
  db: HolaDb,
  keys: readonly string[],
): Promise<PublicSettingRow[]> {
  if (keys.length === 0) return []
  return db
    .select({ key: appSettings.key, value: appSettings.value })
    .from(appSettings)
    .where(inArray(appSettings.key, [...keys]))
}
