import { createHolaClient, HolaApiError, type HolaClient } from '@hola/api-client'
import * as Sentry from '@sentry/nextjs'
import type { InferResponseType } from 'hono/client'
import { env } from './env.ts'

/**
 * Client untuk endpoint publik yang dipanggil dari Server Component.
 * Tidak pernah membawa sesi: `apiClient` di browser yang mengurus token.
 */
export const serverApi: HolaClient = createHolaClient({
  baseUrl: env.API_BASE_URL_INTERNAL ?? env.NEXT_PUBLIC_API_BASE_URL,
  getAccessToken: () => null,
  onUnauthorized: () => undefined,
})

type SportListResponse = InferResponseType<typeof serverApi.api.v1.sports.$get, 200>
type CourtListResponse = InferResponseType<typeof serverApi.api.v1.courts.$get, 200>
type CourtDetailResponse = InferResponseType<(typeof serverApi.api.v1.courts)[':id']['$get'], 200>

export type Sport = SportListResponse['data'][number]
export type Court = CourtListResponse['data'][number]
export type CourtDetail = CourtDetailResponse['data']

/**
 * `fetchSports`/`fetchCourts` mendegradasi ke ini saat API gagal, BUKAN ke `[]`
 * polos: `[]` juga tumbuh secara sah waktu venue memang belum punya data.
 * Pemanggil (halaman) wajib membedakan "gagal dimuat" (retry) dari "memang
 * kosong" (fakta) — menyamakan keduanya jadi "belum ada ..." saat outage
 * adalah klaim palsu ke pengguna.
 */
export type FetchResult<T> = { status: 'ok'; items: T[] } | { status: 'failed' }

/** ISR 5 menit: data lapangan berubah lewat admin, bukan per detik. */
const PUBLIC_REVALIDATE = { next: { revalidate: 300 } } as const

/**
 * Blip API sesaat tidak boleh merobohkan seluruh landing page lewat error
 * boundary — mendegradasi ke `{ status: 'failed' }` sudah benar untuk
 * pengguna. Tapi degradasi ini TIDAK melempar, jadi hook `onRequestError`
 * Next (instrumentation.ts) tidak pernah melihatnya — karena itu ditangkap ke
 * Sentry secara eksplisit di sini SEBELUM mendegradasi, supaya outage tetap
 * kelihatan di monitoring walau halaman tetap tampil normal.
 *
 * PENTING: `createHolaClient` (packages/api-client) MELEMPAR `HolaApiError`
 * untuk respons non-2xx apa pun (kecuali retry token 401 yang berhasil) —
 * `.$get()` di bawah TIDAK PERNAH resolve dengan Response ber-`.ok === false`.
 * Karena itu deteksi kegagalan di sini memakai try/catch pada seluruh
 * pemanggilan, bukan `if (!response.ok)` (yang tidak pernah tercapai — sudah
 * dibuktikan lewat outage API sungguhan saat verifikasi manual). Jangan
 * "disederhanakan" balik ke pola itu.
 */
function reportFetchFailure(endpoint: string, error: unknown): void {
  const status = error instanceof HolaApiError ? error.status : undefined
  const code = error instanceof HolaApiError ? error.code : undefined
  Sentry.captureException(
    new Error(`GET ${endpoint} gagal${status ? ` dengan status ${status}` : ''}`, { cause: error }),
    { extra: { endpoint, status, code } },
  )
}

export async function fetchSports(): Promise<FetchResult<Sport>> {
  try {
    const response = await serverApi.api.v1.sports.$get(undefined, { init: PUBLIC_REVALIDATE })
    const body = await response.json()
    return { status: 'ok', items: body.data }
  } catch (error) {
    reportFetchFailure('/api/v1/sports', error)
    return { status: 'failed' }
  }
}

export async function fetchCourts(filter: { sportId?: string } = {}): Promise<FetchResult<Court>> {
  try {
    const response = await serverApi.api.v1.courts.$get(
      { query: { status: 'active', ...(filter.sportId ? { sport_id: filter.sportId } : {}) } },
      { init: PUBLIC_REVALIDATE },
    )
    const body = await response.json()
    return { status: 'ok', items: body.data }
  } catch (error) {
    reportFetchFailure('/api/v1/courts', error)
    return { status: 'failed' }
  }
}

/**
 * `null` berarti court benar-benar tidak ada (404) — halaman pemanggil
 * memanggil `notFound()`. Status lain (5xx, dst.) BUKAN "tidak ditemukan":
 * dilempar apa adanya supaya hook `onRequestError` Next
 * (`apps/web/src/instrumentation.ts:9`) meneruskannya ke Sentry, bukan
 * disamarkan jadi halaman "lapangan tidak ditemukan" yang menyesatkan saat
 * backend sedang outage.
 *
 * Deteksi 404 memakai `error.status`, bukan `response.status`: sama seperti
 * `fetchSports`/`fetchCourts` di atas, `.$get()` melempar `HolaApiError` untuk
 * 404 juga — tidak pernah resolve dengan Response yang bisa diperiksa
 * `.status`-nya.
 */
export async function fetchCourtDetail(courtId: string): Promise<CourtDetail | null> {
  try {
    const response = await serverApi.api.v1.courts[':id'].$get(
      { param: { id: courtId } },
      { init: PUBLIC_REVALIDATE },
    )
    const body = await response.json()
    return body.data
  } catch (error) {
    if (error instanceof HolaApiError && error.status === 404) return null
    throw error
  }
}

/** URL publik objek media; `object_key` selalu relatif terhadap bucket. */
export function mediaUrl(objectKey: string): string {
  return `${env.NEXT_PUBLIC_MEDIA_BASE_URL.replace(/\/+$/, '')}/${objectKey}`
}
