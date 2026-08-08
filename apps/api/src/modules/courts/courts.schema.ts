import { idSchema } from '@hola/shared'
import { z } from 'zod'

const optionalText = z.string().trim().min(1).max(500).nullable().optional()

export const courtIdParam = z.object({ id: idSchema })

const courtFieldsSchema = z.object({
  venue_id: idSchema,
  sport_id: idSchema,
  // Kode ini masuk apa adanya ke segmen URL `/lapangan/[kode]` (web) — karakter
  // `/` di dalamnya akan memecah segmen jadi rute yang salah dan menghasilkan
  // 404 keras. Dibatasi ke alfanumerik + `_`/`-` supaya nilai ini selalu aman
  // dipakai di URL tanpa perlu encoding di sisi pembaca.
  code: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, 'code hanya boleh berisi huruf, angka, "_", dan "-"'),
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

export const createCourtSchema = courtFieldsSchema.refine(
  (value) => value.min_slots_per_booking <= value.max_slots_per_booking,
  {
    message: 'min_slots_per_booking tidak boleh melebihi max_slots_per_booking',
    path: ['min_slots_per_booking'],
  },
)

export const patchCourtSchema = courtFieldsSchema
  .partial()
  .omit({ venue_id: true, sport_id: true })
  .refine((value) => Object.keys(value).length > 0, { message: 'Minimal satu field harus diubah' })
  .refine(
    (value) =>
      value.min_slots_per_booking === undefined ||
      value.max_slots_per_booking === undefined ||
      value.min_slots_per_booking <= value.max_slots_per_booking,
    {
      message: 'min_slots_per_booking tidak boleh melebihi max_slots_per_booking',
      path: ['min_slots_per_booking'],
    },
  )

const operatingHourSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    opens_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closes_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/),
  })
  .refine((value) => value.opens_time < value.closes_time, {
    path: ['closes_time'],
    message: 'Jam tutup harus setelah jam buka',
  })

export const replaceOperatingHoursSchema = z
  .object({ hours: z.array(operatingHourSchema).length(7) })
  .refine((value) => new Set(value.hours.map((hour) => hour.day_of_week)).size === 7, {
    path: ['hours'],
    message: 'Setiap hari harus tepat satu kali',
  })

export const replaceCourtPhotosSchema = z
  .object({ media_ids: z.array(idSchema).max(12) })
  .refine((value) => new Set(value.media_ids).size === value.media_ids.length, {
    path: ['media_ids'],
    message: 'Satu media hanya boleh muncul sekali.',
  })

export type CreateCourtInput = z.infer<typeof createCourtSchema>
export type PatchCourtInput = z.infer<typeof patchCourtSchema>
export type ReplaceOperatingHoursInput = z.infer<typeof replaceOperatingHoursSchema>
export type ReplaceCourtPhotosInput = z.infer<typeof replaceCourtPhotosSchema>

export const courtsQuerySchema = z
  .object({
    sport_id: idSchema.optional(),
    status: z.enum(['active', 'inactive', 'maintenance']).optional(),
    is_indoor: z.enum(['true', 'false']).optional(),
  })
  .strict()
