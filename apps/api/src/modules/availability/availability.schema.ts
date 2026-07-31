import { idSchema, isoDate } from '@hola/shared'
import { z } from 'zod'

export const availabilityCourtParam = z.object({ court_id: idSchema })

/** Satu tanggal atau range inklusif; bentuk response selalu `days[]`. */
export const availabilityQuery = z.union([
  z.object({ date: isoDate }).strict(),
  z.object({ date_from: isoDate, date_to: isoDate }).strict(),
])
