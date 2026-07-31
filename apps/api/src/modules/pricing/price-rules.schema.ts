/** Kontrak HTTP administrasi aturan harga. */
import { idParam, idSchema, isoDate, money, timeOfDay } from '@hola/shared'
import { z } from 'zod'

const dayType = z.enum(['weekday', 'weekend', 'holiday', 'specific_date'])
const rateClass = z.enum(['peak', 'offpeak', 'special'])

const priceRuleFields = z.object({
  court_id: idSchema.nullable().optional(),
  sport_id: idSchema.nullable().optional(),
  day_type: dayType,
  specific_date: isoDate.nullable().optional(),
  starts_time: timeOfDay,
  ends_time: timeOfDay,
  rate_class: rateClass,
  price_per_hour_amount: money,
  priority: z.number().int().default(0),
  active_from: isoDate.nullable().optional(),
  active_to: isoDate.nullable().optional(),
  is_active: z.boolean().default(true),
})

export const createPriceRuleSchema = priceRuleFields.superRefine((value, ctx) => {
  if (!value.court_id && !value.sport_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['court_id'],
      message: 'court_id atau sport_id wajib diisi.',
    })
  }
  if (value.day_type === 'specific_date' && !value.specific_date) {
    ctx.addIssue({ code: 'custom', path: ['specific_date'], message: 'Wajib untuk specific_date.' })
  }
  if (value.day_type !== 'specific_date' && value.specific_date) {
    ctx.addIssue({ code: 'custom', path: ['specific_date'], message: 'Hanya untuk specific_date.' })
  }
  if (value.starts_time >= value.ends_time) {
    ctx.addIssue({ code: 'custom', path: ['ends_time'], message: 'Harus setelah starts_time.' })
  }
  if (value.active_from && value.active_to && value.active_from > value.active_to) {
    ctx.addIssue({
      code: 'custom',
      path: ['active_to'],
      message: 'Tidak boleh sebelum active_from.',
    })
  }
})
export const patchPriceRuleSchema = priceRuleFields
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Minimal satu field harus diubah.' })
  .superRefine((value, ctx) => {
    if (
      value.starts_time !== undefined &&
      value.ends_time !== undefined &&
      value.starts_time >= value.ends_time
    ) {
      ctx.addIssue({ code: 'custom', path: ['ends_time'], message: 'Harus setelah starts_time.' })
    }
    if (
      value.active_from !== undefined &&
      value.active_to !== undefined &&
      value.active_from &&
      value.active_to &&
      value.active_from > value.active_to
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['active_to'],
        message: 'Tidak boleh sebelum active_from.',
      })
    }
  })

export const priceRuleIdParam = idParam

export const priceRulesQuerySchema = z.object({
  court_id: idSchema.optional(),
  sport_id: idSchema.optional(),
  day_type: dayType.optional(),
  is_active: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
})

export type CreatePriceRuleInput = z.infer<typeof createPriceRuleSchema>
export type PatchPriceRuleInput = z.infer<typeof patchPriceRuleSchema>
export type PriceRulesQuery = z.infer<typeof priceRulesQuerySchema>
