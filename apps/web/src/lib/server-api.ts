import { createHolaClient, type HolaClient } from '@hola/api-client'
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

export async function fetchSports(): Promise<Sport[]> {
  const response = await serverApi.api.v1.sports.$get(undefined, { init: PUBLIC_REVALIDATE })
  if (!response.ok) return []
  const body = await response.json()
  return body.data
}

export async function fetchCourts(filter: { sportId?: string } = {}): Promise<Court[]> {
  const response = await serverApi.api.v1.courts.$get(
    { query: { status: 'active', ...(filter.sportId ? { sport_id: filter.sportId } : {}) } },
    { init: PUBLIC_REVALIDATE },
  )
  if (!response.ok) return []
  const body = await response.json()
  return body.data
}

/** `null` berarti 404 — halaman pemanggil memanggil `notFound()`. */
export async function fetchCourtDetail(courtId: string): Promise<CourtDetail | null> {
  const response = await serverApi.api.v1.courts[':id'].$get(
    { param: { id: courtId } },
    { init: PUBLIC_REVALIDATE },
  )
  if (!response.ok) return null
  const body = await response.json()
  return body.data
}

/** URL publik objek media; `object_key` selalu relatif terhadap bucket. */
export function mediaUrl(objectKey: string): string {
  return `${env.NEXT_PUBLIC_MEDIA_BASE_URL.replace(/\/+$/, '')}/${objectKey}`
}
