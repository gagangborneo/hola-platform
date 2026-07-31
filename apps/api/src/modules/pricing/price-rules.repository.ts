/** Query PostgreSQL pengelolaan aturan harga; resolusi harga tetap di pipeline. */
import { bookingItems, type HolaDb, priceRules } from '@hola/db'
import { and, count, eq, type SQL } from 'drizzle-orm'
import type { Tx } from '../../lib/transaction.ts'
import type {
  CreatePriceRuleInput,
  PatchPriceRuleInput,
  PriceRulesQuery,
} from './price-rules.schema.ts'

type DbExecutor = HolaDb | Tx
export type PriceRuleRow = typeof priceRules.$inferSelect

function filters(
  query: Pick<PriceRulesQuery, 'court_id' | 'sport_id' | 'day_type' | 'is_active'>,
): SQL[] {
  return [
    ...(query.court_id ? [eq(priceRules.courtId, query.court_id)] : []),
    ...(query.sport_id ? [eq(priceRules.sportId, query.sport_id)] : []),
    ...(query.day_type ? [eq(priceRules.dayType, query.day_type)] : []),
    ...(query.is_active === undefined ? [] : [eq(priceRules.isActive, query.is_active)]),
  ]
}

export async function listPriceRules(db: HolaDb, query: PriceRulesQuery): Promise<PriceRuleRow[]> {
  return db
    .select()
    .from(priceRules)
    .where(and(...filters(query)))
    .orderBy(priceRules.priority, priceRules.createdAt, priceRules.id)
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page)
}

export async function countPriceRules(db: HolaDb, query: PriceRulesQuery): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(priceRules)
    .where(and(...filters(query)))
  return result?.value ?? 0
}

export async function findPriceRule(db: DbExecutor, id: string): Promise<PriceRuleRow | null> {
  const [rule] = await db.select().from(priceRules).where(eq(priceRules.id, id)).limit(1)
  return rule ?? null
}

function values(input: CreatePriceRuleInput | PatchPriceRuleInput) {
  return {
    ...(input.court_id === undefined ? {} : { courtId: input.court_id }),
    ...(input.sport_id === undefined ? {} : { sportId: input.sport_id }),
    ...(input.day_type === undefined ? {} : { dayType: input.day_type }),
    ...(input.specific_date === undefined ? {} : { specificDate: input.specific_date }),
    ...(input.starts_time === undefined ? {} : { startsTime: input.starts_time }),
    ...(input.ends_time === undefined ? {} : { endsTime: input.ends_time }),
    ...(input.rate_class === undefined ? {} : { rateClass: input.rate_class }),
    ...(input.price_per_hour_amount === undefined
      ? {}
      : { pricePerHourAmount: input.price_per_hour_amount }),
    ...(input.priority === undefined ? {} : { priority: input.priority }),
    ...(input.active_from === undefined ? {} : { activeFrom: input.active_from }),
    ...(input.active_to === undefined ? {} : { activeTo: input.active_to }),
    ...(input.is_active === undefined ? {} : { isActive: input.is_active }),
  }
}

export async function createPriceRule(tx: Tx, input: CreatePriceRuleInput): Promise<PriceRuleRow> {
  const [rule] = await tx
    .insert(priceRules)
    .values({
      courtId: input.court_id ?? null,
      sportId: input.sport_id ?? null,
      dayType: input.day_type,
      specificDate: input.specific_date ?? null,
      startsTime: input.starts_time,
      endsTime: input.ends_time,
      rateClass: input.rate_class,
      pricePerHourAmount: input.price_per_hour_amount,
      priority: input.priority,
      activeFrom: input.active_from ?? null,
      activeTo: input.active_to ?? null,
      isActive: input.is_active,
    })
    .returning()
  if (!rule) throw new Error('price_rules gagal dibuat')
  return rule
}

export async function patchPriceRule(
  tx: Tx,
  id: string,
  input: PatchPriceRuleInput,
): Promise<PriceRuleRow | null> {
  const [rule] = await tx
    .update(priceRules)
    .set(values(input))
    .where(eq(priceRules.id, id))
    .returning()
  return rule ?? null
}

export async function hasPriceRuleUsage(db: DbExecutor, id: string): Promise<boolean> {
  const [item] = await db
    .select({ id: bookingItems.id })
    .from(bookingItems)
    .where(eq(bookingItems.priceRuleId, id))
    .limit(1)
  return item !== undefined
}

export async function deletePriceRule(tx: Tx, id: string): Promise<boolean> {
  const [rule] = await tx
    .delete(priceRules)
    .where(eq(priceRules.id, id))
    .returning({ id: priceRules.id })
  return rule !== undefined
}
