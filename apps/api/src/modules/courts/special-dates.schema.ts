/** Kontrak HTTP kalender hari khusus venue. */
import { idParam, isoDate } from '@hola/shared'
import { z } from 'zod'

export const specialDateIdParam = idParam
export const createSpecialDateSchema = z.object({
  date: isoDate,
  name: z.string().trim().min(1).max(120),
  day_type_override: z.enum(['weekday', 'weekend', 'holiday']).nullable().optional(),
  is_closed: z.boolean().default(false),
})

export type CreateSpecialDateInput = z.infer<typeof createSpecialDateSchema>
