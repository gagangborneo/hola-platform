import type { InferResponseType } from 'hono/client'
import { serverApi } from './server-api.ts'

type PublicConfigResponse = InferResponseType<typeof serverApi.api.v1.config.public.$get, 200>
export type PublicConfig = PublicConfigResponse['data']

/**
 * `server_time` berubah tiap permintaan, jadi tidak boleh di-ISR — countdown hold
 * bergantung padanya (E-23).
 */
export async function fetchPublicConfig(): Promise<PublicConfig> {
  const response = await serverApi.api.v1.config.public.$get(undefined, {
    init: { cache: 'no-store' },
  })
  if (!response.ok) throw new Error('Konfigurasi publik tidak dapat dimuat.')
  const body = await response.json()
  return body.data
}
