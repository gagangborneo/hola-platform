/**
 * Primitif zod untuk membaca env.
 *
 * Env selalu datang sebagai string. Coercion dilakukan di sini, satu kali,
 * supaya tidak ada `Number(process.env.X)` yang tersebar di service.
 */
import { z } from 'zod'

/** `"4000"` → `4000`. Menolak string yang bukan bilangan bulat. */
export const intFromEnv = z.coerce.number().int()

/** `"0.1"` → `0.1`. */
export const numberFromEnv = z.coerce.number()

/**
 * `"true"` / `"false"` → boolean.
 *
 * Sengaja TIDAK memakai `z.coerce.boolean()`: coercion bawaan JavaScript
 * menganggap string `"false"` bernilai **true**, yang berarti
 * `MIDTRANS_IS_PRODUCTION=false` akan menyalakan mode produksi.
 */
export const booleanFromEnv = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.enum(['true', 'false', '1', '0']))
  .transform((v) => v === 'true' || v === '1')

/** `"a,b , c"` → `['a', 'b', 'c']`. Entri kosong dibuang. */
export const csvList = z
  .string()
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  )
  .pipe(z.array(z.string()).min(1))
