import { idSchema } from '@hola/shared'
import { z } from 'zod'

const optionalText = z.string().trim().min(1).max(500).nullable().optional()

export const courtIdParam = z.object({ id: idSchema })

export const createCourtSchema = z
  .object({
    venue_id: idSchema,
    sport_id: idSchema,
    code: z.string().trim().min(1).max(32),
    name: z.string().trim().min(1).max(120),
    description: optionalText,
    surface: optionalText,
    is_indoor: z.boolean().default(false),
    slot_duration_minutes: z
      .union([z.literal(30), z.literal(60), z.literal(90), z.literal(120)])
      .default(60),
    min_slots_per_booking: z.number().int().min(1).default(1),
    max_slots_per_booking: z.number().int().min(1).default(4),
    max_players: z.number().int().positive().nullable().optional(),
    status: z.enum(['active', 'maintenance', 'inactive']).default('active'),
    sort_order: z.number().int().default(0),
  })
  .refine((value) => value.min_slots_per_booking <= value.max_slots_per_booking, {
    message: 'min_slots_per_booking tidak boleh melebihi max_slots_per_booking',
    path: ['min_slots_per_booking'],
  })

export const patchCourtSchema = createCourtSchema
  .partial()
  .omit({ venue_id: true, sport_id: true })
  .refine((value) => Object.keys(value).length > 0, { message: 'Minimal satu field harus diubah' })

export type CreateCourtInput = z.infer<typeof createCourtSchema>
export type PatchCourtInput = z.infer<typeof patchCourtSchema>
