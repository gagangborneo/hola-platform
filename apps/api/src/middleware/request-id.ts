/**
 * Request id + waktu server.
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 9, docs/04-API-CONTRACT.md § 4.
 *
 * ULID, bukan UUID: ia terurut waktu dan enak dibaca/diketik ulang oleh manusia
 * yang sedang melaporkan bug lewat WhatsApp — yang memang cara staf melaporkan
 * masalah di sini.
 */
import type { MiddlewareHandler } from 'hono'
import { isValid, ulid } from 'ulid'
import { HEADER } from '../lib/response.ts'
import { serverNow } from '../lib/time.ts'

export interface RequestVariables {
  requestId: string
  /** Instan tunggal untuk SELURUH request (BR-TS-10, BR-SV-15). */
  now: Date
}

export const requestId: MiddlewareHandler<{ Variables: RequestVariables }> = async (c, next) => {
  // Hormati id dari proxy bila ada, supaya jejaknya menyambung lintas layanan.
  const incoming = c.req.header(HEADER.REQUEST_ID)
  const id = incoming && isValid(incoming) ? incoming : ulid()

  c.set('requestId', id)
  // Satu instan per request: seluruh perhitungan di dalamnya memakai jam yang
  // sama, sehingga harga dan validasi horizon tidak bisa berbeda satu detik.
  c.set('now', serverNow())
  c.header(HEADER.REQUEST_ID, id)

  await next()
}
