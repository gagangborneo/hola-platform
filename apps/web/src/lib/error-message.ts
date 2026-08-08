import { HolaApiError } from '@hola/api-client'

/**
 * `HolaApiError.message` sudah berbahasa Indonesia dan aman ditampilkan apa
 * adanya ke customer (dibentuk peladen). Error lain — mis. `TypeError: Failed
 * to fetch` saat jaringan putus, atau error runtime lain — membawa teks bahasa
 * Inggris internal yang tidak boleh bocor ke UI. `fallback` dipakai untuk
 * kasus itu (I3).
 */
export function displayErrorMessage(error: unknown, fallback: string): string {
  return error instanceof HolaApiError ? error.message : fallback
}
