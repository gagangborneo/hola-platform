import type { Court, FetchResult } from './server-api.ts'

/** Nama lapangan yang dipakai layar akun; `code` ikut karena itu yang disebut petugas. */
export interface CourtSummary {
  name: string
  code: string
}

/**
 * Detail booking hanya membawa `court_id`. Impor tipe di atas bersifat
 * type-only sehingga modul ini tetap aman diimpor komponen klien — tidak ada
 * kode peladen (`server-api.ts`) yang ikut ke bundle browser.
 *
 * Katalog yang gagal dimuat menghasilkan peta kosong, bukan lemparan: layar
 * detail tetap berguna dengan nama lapangan yang mundur ke label netral.
 */
export function courtSummaryMap(result: FetchResult<Court>): Record<string, CourtSummary> {
  if (result.status !== 'ok') return {}
  return Object.fromEntries(
    result.items.map((court) => [court.id, { name: court.name, code: court.code }]),
  )
}
