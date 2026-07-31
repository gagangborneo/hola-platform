/** Kontrak baca kalender klaim slot untuk staff/admin. */
import { idSchema, isoDate } from '@hola/shared'
import { z } from 'zod'

export const slotClaimsQuerySchema = z
  .object({
    court_id: idSchema.optional(),
    slot_date_from: isoDate.optional(),
    slot_date_to: isoDate.optional(),
    claim_type: z.enum(['booking', 'event', 'match', 'maintenance']).optional(),
    status: z.enum(['held', 'confirmed', 'released']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(25),
  })
  .refine(
    (value) =>
      !value.slot_date_from || !value.slot_date_to || value.slot_date_from <= value.slot_date_to,
    { path: ['slot_date_to'], message: 'Tidak boleh sebelum slot_date_from.' },
  )

export type SlotClaimsQuery = z.infer<typeof slotClaimsQuerySchema>
