import { idParam, idSchema, isoDateTime } from '@hola/shared'
import { z } from 'zod'

export const courtMaintenanceIdParam = idParam

export const createCourtMaintenanceSchema = z
  .object({
    court_id: idSchema,
    starts_at: isoDateTime,
    ends_at: isoDateTime,
    reason: z.string().trim().min(1).max(500),
    force: z.boolean().default(false),
    confirm: z.boolean().optional(),
  })
  .refine((value) => new Date(value.starts_at).getTime() < new Date(value.ends_at).getTime(), {
    path: ['ends_at'],
    message: 'ends_at harus setelah starts_at.',
  })

export const courtMaintenancesQuerySchema = z.object({
  court_id: idSchema.optional(),
  active_only: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
})

export type CreateCourtMaintenanceInput = z.infer<typeof createCourtMaintenanceSchema>
export type CourtMaintenancesQuery = z.infer<typeof courtMaintenancesQuerySchema>
