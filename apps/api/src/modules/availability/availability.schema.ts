import { idSchema, isoDate } from '@hola/shared'
import { z } from 'zod'

export const availabilityCourtParam = z.object({ court_id: idSchema })

/** Respons multi-tanggal belum dikontrak; jalur publik v1 memakai satu tanggal. */
export const availabilityQuery = z.object({ date: isoDate })
