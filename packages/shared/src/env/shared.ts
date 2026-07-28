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

const splitCsv = (v: string): string[] =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

/**
 * `"a,b , c"` → `['a', 'b', 'c']`. Entri kosong dibuang, dan daftar kosong
 * DITOLAK — dipakai untuk env yang tidak masuk akal bila kosong, mis.
 * `CORS_ORIGINS`.
 */
export const csvList = z.string().transform(splitCsv).pipe(z.array(z.string()).min(1))

/**
 * Seperti `csvList`, tetapi string kosong sah dan menghasilkan `[]`.
 *
 * Dipakai untuk allowlist opsional (`MIDTRANS_WEBHOOK_ALLOWED_IPS`): baris
 * kosong di `.env.example` adalah cara normal menyatakan "tidak ada allowlist",
 * dan itu tidak boleh membuat aplikasi gagal boot.
 */
export const optionalCsvList = z.string().transform(splitCsv)
