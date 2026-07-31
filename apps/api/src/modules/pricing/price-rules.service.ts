/** Business rule CRUD aturan harga dan invalidasi cache availability. */
import { err } from '../../lib/errors.ts'
import { withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import type { Viewer } from '../auth/auth.types.ts'
import {
  availabilityPattern,
  invalidateAvailabilityPattern,
} from '../availability/availability-cache.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import {
  countPriceRules,
  createPriceRule,
  deletePriceRule,
  findPriceRule,
  hasPriceRuleUsage,
  listPriceRules,
  type PriceRuleRow,
  patchPriceRule,
} from './price-rules.repository.ts'
import {
  type CreatePriceRuleInput,
  createPriceRuleSchema,
  type PatchPriceRuleInput,
  type PriceRulesQuery,
} from './price-rules.schema.ts'

export interface PriceRulesServiceContext
  extends Pick<CoreDependencies, 'db' | 'redis' | 'redisKeys' | 'safeRedis' | 'logger'> {
  actor: Viewer
  requestId: string | undefined
  ipAddress: string | undefined
  userAgent: string | undefined
}

function audit(ctx: PriceRulesServiceContext) {
  return {
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
  }
}

function afterPriceChange(ctx: PriceRulesServiceContext): () => Promise<void> {
  return () => invalidateAvailabilityPattern(ctx, availabilityPattern(ctx.redisKeys, '*'))
}

function applyPatch(before: PriceRuleRow, patch: PatchPriceRuleInput): CreatePriceRuleInput {
  const candidate = {
    court_id: patch.court_id === undefined ? before.courtId : patch.court_id,
    sport_id: patch.sport_id === undefined ? before.sportId : patch.sport_id,
    day_type: patch.day_type ?? before.dayType,
    specific_date: patch.specific_date === undefined ? before.specificDate : patch.specific_date,
    starts_time: patch.starts_time ?? before.startsTime.slice(0, 5),
    ends_time: patch.ends_time ?? before.endsTime.slice(0, 5),
    rate_class: patch.rate_class ?? before.rateClass,
    price_per_hour_amount: patch.price_per_hour_amount ?? before.pricePerHourAmount,
    priority: patch.priority ?? before.priority,
    active_from: patch.active_from === undefined ? before.activeFrom : patch.active_from,
    active_to: patch.active_to === undefined ? before.activeTo : patch.active_to,
    is_active: patch.is_active ?? before.isActive,
  }
  const parsed = createPriceRuleSchema.safeParse(candidate)
  if (!parsed.success) throw err.validation(parsed.error.issues)
  return parsed.data
}

export async function listAdminPriceRules(
  ctx: PriceRulesServiceContext,
  query: PriceRulesQuery,
): Promise<{ rows: PriceRuleRow[]; totalCount: number }> {
  const [rows, totalCount] = await Promise.all([
    listPriceRules(ctx.db, query),
    countPriceRules(ctx.db, query),
  ])
  return { rows, totalCount }
}

export async function createAdminPriceRule(
  ctx: PriceRulesServiceContext,
  input: CreatePriceRuleInput,
): Promise<PriceRuleRow> {
  return withTransaction(ctx.db, async ({ tx, afterCommit }) => {
    const rule = await createPriceRule(tx, input)
    await writeAuditLog(tx, {
      ...audit(ctx),
      action: 'price_rule.create',
      entityType: 'price_rule',
      entityId: rule.id,
      before: undefined,
      after: rule,
    })
    afterCommit(afterPriceChange(ctx))
    return rule
  })
}

export async function patchAdminPriceRule(
  ctx: PriceRulesServiceContext,
  id: string,
  input: PatchPriceRuleInput,
): Promise<PriceRuleRow> {
  const before = await findPriceRule(ctx.db, id)
  if (!before) throw err.notFound('Aturan harga tidak ditemukan.')
  applyPatch(before, input)
  return withTransaction(ctx.db, async ({ tx, afterCommit }) => {
    const rule = await patchPriceRule(tx, id, input)
    if (!rule) throw err.notFound('Aturan harga tidak ditemukan.')
    await writeAuditLog(tx, {
      ...audit(ctx),
      action: 'price_rule.update',
      entityType: 'price_rule',
      entityId: id,
      before,
      after: rule,
    })
    afterCommit(afterPriceChange(ctx))
    return rule
  })
}

export async function deleteAdminPriceRule(
  ctx: PriceRulesServiceContext,
  id: string,
): Promise<void> {
  const before = await findPriceRule(ctx.db, id)
  if (!before) throw err.notFound('Aturan harga tidak ditemukan.')
  if (await hasPriceRuleUsage(ctx.db, id)) {
    throw err.conflict(
      'Aturan harga yang sudah dipakai tidak dapat dihapus. Nonaktifkan aturan ini.',
    )
  }
  await withTransaction(ctx.db, async ({ tx, afterCommit }) => {
    if (!(await deletePriceRule(tx, id))) throw err.notFound('Aturan harga tidak ditemukan.')
    await writeAuditLog(tx, {
      ...audit(ctx),
      action: 'price_rule.delete',
      entityType: 'price_rule',
      entityId: id,
      before,
      after: undefined,
    })
    afterCommit(afterPriceChange(ctx))
  })
}
