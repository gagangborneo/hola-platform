import { HolaApiError } from '@hola/api-client'

function isError(value: unknown): value is Error {
  return value instanceof Error
}

/** Pesan aman untuk form; respons terstruktur API tetap menang lewat HolaApiError. */
export function formErrorMessage(error: unknown): string {
  if (error instanceof HolaApiError) return error.message
  if (isError(error)) return error.message
  return 'Terjadi kesalahan. Silakan coba lagi.'
}

export function validationErrorMessage(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? 'Data formulir belum valid.'
}
