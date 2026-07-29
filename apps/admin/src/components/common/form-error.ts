import { HolaApiError } from '@hola/api-client'

function isError(value: unknown): value is Error {
  return value instanceof Error
}

/** Pesan aman untuk UI; detail internal API tidak ditampilkan mentah ke operator. */
export function formErrorMessage(error: unknown): string {
  if (error instanceof HolaApiError) return error.message
  if (isError(error)) return error.message
  return 'Terjadi kesalahan. Silakan coba lagi.'
}
