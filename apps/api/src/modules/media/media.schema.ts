/** Schema request media; aturan kind/mime/ukuran spesifik ada di service. */
import { idParam } from '@hola/shared'
import { z } from 'zod'

export const presignMediaSchema = z.object({
  kind: z.string().trim().min(1).max(64),
  content_type: z.string().trim().min(1).max(128),
  size_bytes: z.number().int().positive(),
})

export const mediaIdParam = idParam
