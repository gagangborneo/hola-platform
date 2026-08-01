import {
  idParam,
  idSchema,
  money,
  offsetPaginationQuery,
  PROMO_APPLIES_TO,
  PROMO_STATUS,
  PROMO_TYPE,
} from '@hola/shared'
import { z } from 'zod'

const promoType = z.enum([PROMO_TYPE.PERCENT, PROMO_TYPE.FIXED, PROMO_TYPE.FREE_SLOT])
const appliesTo = z.enum([
  PROMO_APPLIES_TO.BOOKING,
  PROMO_APPLIES_TO.EVENT,
  PROMO_APPLIES_TO.TOURNAMENT,
  PROMO_APPLIES_TO.ALL,
])
const promoStatus = z.enum([
  PROMO_STATUS.DRAFT,
  PROMO_STATUS.ACTIVE,
  PROMO_STATUS.PAUSED,
  PROMO_STATUS.EXPIRED,
  PROMO_STATUS.ARCHIVED,
])
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{3,20}$/)

const commonPromo = z.object({
  code: code.nullable(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).nullable().optional(),
  max_discount_amount: money.nullable().optional(),
  min_transaction_amount: money.default(0),
  min_slot_count: z.number().int().min(1).nullable().optional(),
  applies_to: appliesTo,
  quota_total: z.number().int().positive().nullable().optional(),
  quota_per_user: z.number().int().positive().nullable().optional(),
  valid_from: z.string().datetime({ offset: true }),
  valid_until: z.string().datetime({ offset: true }),
  is_auto: z.boolean().default(false),
  is_stackable: z.boolean().default(false),
  priority: z.number().int().default(0),
  is_new_customer_only: z.boolean().default(false),
  min_tier_code: z.enum(['bronze', 'silver', 'gold', 'platinum']).nullable().optional(),
  status: promoStatus.default(PROMO_STATUS.DRAFT),
})

export const createPromoSchema = z
  .discriminatedUnion('type', [
    commonPromo.extend({
      type: z.literal(PROMO_TYPE.PERCENT),
      value_percent: z.number().positive().max(100),
      value_amount: z.null().optional(),
      free_slot_count: z.null().optional(),
    }),
    commonPromo.extend({
      type: z.literal(PROMO_TYPE.FIXED),
      value_percent: z.null().optional(),
      value_amount: money.refine((value) => value > 0),
      free_slot_count: z.null().optional(),
    }),
    commonPromo.extend({
      type: z.literal(PROMO_TYPE.FREE_SLOT),
      value_percent: z.null().optional(),
      value_amount: z.null().optional(),
      free_slot_count: z.number().int().positive(),
    }),
  ])
  .superRefine((value, ctx) => {
    if ((value.code === null) !== value.is_auto) {
      ctx.addIssue({
        code: 'custom',
        path: ['code'],
        message: 'code harus NULL hanya untuk auto promo',
      })
    }
    if (new Date(value.valid_from) >= new Date(value.valid_until)) {
      ctx.addIssue({
        code: 'custom',
        path: ['valid_until'],
        message: 'valid_until harus setelah valid_from',
      })
    }
    if (
      value.type === PROMO_TYPE.PERCENT &&
      value.value_percent > 25 &&
      !value.max_discount_amount
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['max_discount_amount'],
        message: 'wajib untuk diskon persen di atas 25%',
      })
    }
    if (
      value.type === PROMO_TYPE.FREE_SLOT &&
      (value.applies_to === PROMO_APPLIES_TO.EVENT ||
        value.applies_to === PROMO_APPLIES_TO.TOURNAMENT ||
        !value.min_slot_count ||
        value.min_slot_count <= value.free_slot_count)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['min_slot_count'],
        message: 'free_slot membutuhkan min_slot_count lebih besar dari free_slot_count',
      })
    }
  })

export const patchPromoSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
    type: promoType.optional(),
    value_percent: z.number().positive().max(100).nullable().optional(),
    value_amount: money.nullable().optional(),
    free_slot_count: z.number().int().positive().nullable().optional(),
    max_discount_amount: money.nullable().optional(),
    min_transaction_amount: money.optional(),
    min_slot_count: z.number().int().positive().nullable().optional(),
    applies_to: appliesTo.optional(),
    quota_total: z.number().int().positive().nullable().optional(),
    quota_per_user: z.number().int().positive().nullable().optional(),
    valid_from: z.string().datetime({ offset: true }).optional(),
    valid_until: z.string().datetime({ offset: true }).optional(),
    is_auto: z.boolean().optional(),
    is_stackable: z.boolean().optional(),
    priority: z.number().int().optional(),
    is_new_customer_only: z.boolean().optional(),
    min_tier_code: z.enum(['bronze', 'silver', 'gold', 'platinum']).nullable().optional(),
    status: promoStatus.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Minimal satu field harus diubah.' })

const validateBookingItem = z.object({
  court_id: idSchema,
  starts_at: z.string().datetime({ offset: true }),
})
const validateBookingAddon = z.object({
  addon_id: idSchema,
  quantity: z.number().int().min(1).max(20),
})

export const validatePromoSchema = z.object({
  code,
  kind: z.literal('booking'),
  items: z.array(validateBookingItem).min(1).max(8),
  addons: z.array(validateBookingAddon).max(10).default([]),
})

export const promosQuerySchema = offsetPaginationQuery.extend({
  status: promoStatus.optional(),
  is_auto: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  applies_to: appliesTo.optional(),
  q: z.string().trim().min(1).max(120).optional(),
})

export const redemptionsQuerySchema = offsetPaginationQuery
export const promoIdParam = idParam

export type CreatePromoInput = z.infer<typeof createPromoSchema>
export type PatchPromoInput = z.infer<typeof patchPromoSchema>
export type ValidatePromoInput = z.infer<typeof validatePromoSchema>
export type PromosQuery = z.infer<typeof promosQuerySchema>
export type RedemptionsQuery = z.infer<typeof redemptionsQuerySchema>
