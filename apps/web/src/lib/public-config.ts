import type { InferResponseType } from 'hono/client'
import { serverApi } from './server-api.ts'

type PublicConfigResponse = InferResponseType<typeof serverApi.api.v1.config.public.$get, 200>
export type PublicConfig = PublicConfigResponse['data']

/**
 * `server_time` berubah tiap permintaan, jadi tidak boleh di-ISR — countdown hold
 * bergantung padanya (E-23).
 *
 * `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa pun —
 * `$get` di bawah TIDAK PERNAH resolve dengan Response ber-`.ok === false`,
 * jadi kegagalan sudah menjalar sebagai exception ke pemanggil (ditangkap
 * error boundary halaman), bukan `if (!response.ok)`.
 */
export async function fetchPublicConfig(): Promise<PublicConfig> {
  const response = await serverApi.api.v1.config.public.$get(undefined, {
    init: { cache: 'no-store' },
  })
  const body = await response.json()
  return body.data
}
