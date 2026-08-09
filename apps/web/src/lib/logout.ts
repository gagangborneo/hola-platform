import { authStore } from './auth.ts'
import { env } from './env.ts'

/**
 * Mencabut refresh cookie di peladen lalu membuang token dari memori. Sesi lokal
 * tetap dibersihkan meskipun API tidak dapat dijangkau — kalau tidak, pengguna
 * yang menekan "Keluar" saat jaringan putus akan tetap terlihat masuk.
 */
export async function logout(): Promise<void> {
  try {
    const accessToken = authStore.getAccessToken()
    if (accessToken) {
      const baseUrl = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, '')
      await globalThis.fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    }
  } catch {
    // Diabaikan dengan sengaja: pembersihan sesi lokal di bawah tetap wajib jalan.
  } finally {
    authStore.clearAccessToken()
  }
}
