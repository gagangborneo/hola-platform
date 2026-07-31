/** Query data yang dibutuhkan pipeline harga. */
import { addons, appSettings, courts, type HolaDb, priceRules, specialDates } from '@hola/db'
import { SETTINGS_KEY } from '@hola/shared'
import { and, eq, inArray } from 'drizzle-orm'

export type PricingCourt = Pick<
  typeof courts.$inferSelect,
  'code' | 'id' | 'slotDurationMinutes' | 'sportId' | 'status'
>
export type PricingAddon = Pick<
  typeof addons.$inferSelect,
  'code' | 'id' | 'isActive' | 'name' | 'priceAmount'
>
export type PricingPriceRule = typeof priceRules.$inferSelect
export type PricingSpecialDate = Pick<typeof specialDates.$inferSelect, 'date' | 'dayTypeOverride'>

export async function findPricingCourts(
  db: HolaDb,
  courtIds: readonly string[],
): Promise<PricingCourt[]> {
  if (courtIds.length === 0) return []
  return db
    .select({
      id: courts.id,
      code: courts.code,
      sportId: courts.sportId,
      slotDurationMinutes: courts.slotDurationMinutes,
      status: courts.status,
    })
    .from(courts)
    .where(inArray(courts.id, [...courtIds]))
    .limit(courtIds.length)
}

export async function findPricingAddons(
  db: HolaDb,
  addonIds: readonly string[],
): Promise<PricingAddon[]> {
  if (addonIds.length === 0) return []
  return db
    .select({
      id: addons.id,
      code: addons.code,
      name: addons.name,
      priceAmount: addons.priceAmount,
      isActive: addons.isActive,
    })
    .from(addons)
    .where(inArray(addons.id, [...addonIds]))
    .limit(addonIds.length)
}

/**
 * Rules dibatasi 1.000 baris untuk memenuhi BR-SV-26. Angka ini jauh melampaui
 * kebutuhan satu venue v1 dan semua seleksi bisnis terjadi di pipeline murni.
 */
export async function findPricingPriceRules(db: HolaDb): Promise<PricingPriceRule[]> {
  return db.select().from(priceRules).limit(1000)
}

export async function findPricingSpecialDates(
  db: HolaDb,
  dates: readonly string[],
): Promise<PricingSpecialDate[]> {
  if (dates.length === 0) return []
  return db
    .select({ date: specialDates.date, dayTypeOverride: specialDates.dayTypeOverride })
    .from(specialDates)
    .where(inArray(specialDates.date, [...dates]))
    .limit(dates.length)
}

export async function findTaxRateSetting(db: HolaDb): Promise<unknown> {
  const [setting] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(and(eq(appSettings.key, SETTINGS_KEY.TAX_RATE)))
    .limit(1)
  return setting?.value
}
