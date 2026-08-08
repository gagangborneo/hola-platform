import { createHolaClient, type HolaClient } from '@hola/api-client'
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

/** ISR 5 menit: data lapangan berubah lewat admin, bukan per detik. */
const PUBLIC_REVALIDATE = { next: { revalidate: 300 } } as const

/**
 * Blip API sesaat tidak boleh merobohkan seluruh landing page lewat error
 * boundary — mendegradasi ke `[]` (state kosong) sudah benar untuk pengguna.
 * Tapi degradasi ini TIDAK melempar, jadi hook `onRequestError` Next
 * (instrumentation.ts) tidak pernah melihatnya — karena itu ditangkap ke
 * Sentry secara eksplisit di sini SEBELUM mendegradasi, supaya outage tetap
 * kelihatan di monitoring walau halaman tetap tampil normal. Jangan
 * "disederhanakan" jadi `if (!response.ok) return []` polos lagi.
 */
function reportFetchFailure(endpoint: string, status: number): void {
  Sentry.captureException(new Error(`GET ${endpoint} gagal dengan status ${status}`), {
    extra: { endpoint, status },
  })
}

export async function fetchSports(): Promise<Sport[]> {
  const response = await serverApi.api.v1.sports.$get(undefined, { init: PUBLIC_REVALIDATE })
  if (!response.ok) {
    reportFetchFailure('/api/v1/sports', response.status)
    return []
  }
  const body = await response.json()
  return body.data
}

export async function fetchCourts(filter: { sportId?: string } = {}): Promise<Court[]> {
  const response = await serverApi.api.v1.courts.$get(
    { query: { status: 'active', ...(filter.sportId ? { sport_id: filter.sportId } : {}) } },
    { init: PUBLIC_REVALIDATE },
  )
  if (!response.ok) {
    reportFetchFailure('/api/v1/courts', response.status)
    return []
  }
  const body = await response.json()
  return body.data
}

/**
 * `null` berarti court benar-benar tidak ada (404) — halaman pemanggil
 * memanggil `notFound()`. Status lain (5xx, dst.) BUKAN "tidak ditemukan":
 * dilempar apa adanya supaya hook `onRequestError` Next
 * (`apps/web/src/instrumentation.ts:9`) meneruskannya ke Sentry, bukan
 * disamarkan jadi halaman "lapangan tidak ditemukan" yang menyesatkan saat
 * backend sedang outage.
 */
export async function fetchCourtDetail(courtId: string): Promise<CourtDetail | null> {
  const response = await serverApi.api.v1.courts[':id'].$get(
    { param: { id: courtId } },
    { init: PUBLIC_REVALIDATE },
  )
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`GET /api/v1/courts/${courtId} gagal dengan status ${response.status}`)
  }
  const body = await response.json()
  return body.data
}

/** URL publik objek media; `object_key` selalu relatif terhadap bucket. */
export function mediaUrl(objectKey: string): string {
  return `${env.NEXT_PUBLIC_MEDIA_BASE_URL.replace(/\/+$/, '')}/${objectKey}`
}
