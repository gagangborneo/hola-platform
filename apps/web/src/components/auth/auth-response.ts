interface AuthSessionPayload {
  data: { access_token: string }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Memastikan respons login memiliki access token sebelum disimpan di memori. */
export function isAuthSessionPayload(value: unknown): value is AuthSessionPayload {
  return (
    isRecord(value) &&
    isRecord(value.data) &&
    typeof value.data.access_token === 'string' &&
    value.data.access_token.length > 0
  )
}
