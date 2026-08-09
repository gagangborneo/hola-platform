import { apiClient } from './api-client.ts'

/**
 * Query key `GET /auth/sessions`, dibagi dengan form ganti password: server
 * mencabut seluruh refresh token saat password berganti, jadi daftar perangkat
 * yang sudah tampil di layar langsung basi begitu form itu berhasil.
 */
export const AUTH_SESSIONS_QUERY_KEY = ['auth-sessions'] as const

export async function fetchAuthSessions() {
  const response = await apiClient.api.v1.auth.sessions.$get()
  return response.json()
}
