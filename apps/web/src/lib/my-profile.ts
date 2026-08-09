import { apiClient } from './api-client.ts'

/**
 * Satu query key untuk `GET /me/profile`, dipakai halaman profil DAN kartu
 * preferensi notifikasi. Keduanya membaca baris yang sama, jadi berbagi cache
 * react-query mencegah dua request untuk satu data — sekaligus membuat
 * penyimpanan di satu halaman langsung terlihat di halaman lain.
 */
export const MY_PROFILE_QUERY_KEY = ['my-profile'] as const

export async function fetchMyProfile() {
  // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa pun —
  // `$get` di bawah TIDAK PERNAH resolve dengan Response ber-`.ok === false`.
  const response = await apiClient.api.v1.me.profile.$get()
  return response.json()
}

export type MyProfile = Awaited<ReturnType<typeof fetchMyProfile>>['data']
export type MyCustomerProfile = NonNullable<MyProfile['profile']>
