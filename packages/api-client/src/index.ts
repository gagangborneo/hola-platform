/**
 * Typed HTTP client untuk seluruh aplikasi Hola.
 *
 * AppType adalah type-only import: `verbatimModuleSyntax` memastikan runtime
 * aplikasi API tidak ikut masuk ke bundle web, admin, atau mobile.
 */
import { hc } from 'hono/client'
import type { AppType } from '../../../apps/api/src/app.ts'

type MaybePromise<T> = T | Promise<T>

export interface HolaApiErrorOptions {
  status: number
  code: string
  message: string
  details: unknown
  requestId: string | undefined
}

/** Error API terstruktur; client bercabang pada `code`, bukan `message`. */
export class HolaApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown
  readonly requestId: string | undefined

  constructor(options: HolaApiErrorOptions) {
    super(options.message)
    this.name = 'HolaApiError'
    this.status = options.status
    this.code = options.code
    this.details = options.details
    this.requestId = options.requestId
  }
}

export interface CreateHolaClientOptions {
  /** Origin API, mis. `https://api.hola.id`. */
  baseUrl: string
  /** Access token hidup di memori pemanggil, bukan localStorage. */
  getAccessToken: () => MaybePromise<string | null>
  /** Dipanggil sekali jika refresh tidak dapat memulihkan sesi. */
  onUnauthorized: () => MaybePromise<void>
  /** Injeksi untuk SSR/test; browser dan Node 20 memakai `globalThis.fetch`. */
  fetch?: typeof fetch
}

export type HolaClient = ReturnType<typeof hc<AppType>>

interface ApiErrorEnvelope {
  error: {
    code: string
    message: string
    details?: unknown
    request_id?: string
  }
}

interface RefreshEnvelope {
  data: {
    access_token: string
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!isRecord(value) || !isRecord(value.error)) return false
  return typeof value.error.code === 'string' && typeof value.error.message === 'string'
}

function isRefreshEnvelope(value: unknown): value is RefreshEnvelope {
  return (
    isRecord(value) &&
    isRecord(value.data) &&
    typeof value.data.access_token === 'string' &&
    value.data.access_token.length > 0
  )
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json()
  } catch {
    return undefined
  }
}

async function toHolaApiError(response: Response): Promise<HolaApiError> {
  const body = await parseJson(response)
  if (!isApiErrorEnvelope(body)) {
    return new HolaApiError({
      status: response.status,
      code: 'INTERNAL_ERROR',
      message: 'Respons API tidak dapat diproses.',
      details: undefined,
      requestId: response.headers.get('x-request-id') ?? undefined,
    })
  }

  return new HolaApiError({
    status: response.status,
    code: body.error.code,
    message: body.error.message,
    details: body.error.details,
    requestId: body.error.request_id ?? response.headers.get('x-request-id') ?? undefined,
  })
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

/**
 * Membuat Hono RPC client dengan bearer token dan pemulihan sesi T-12.
 *
 * Refresh menggunakan cookie HttpOnly untuk web/admin. Token hasil refresh
 * disimpan hanya dalam closure ini sampai pemanggil mengganti token memorinya.
 */
export function createHolaClient(options: CreateHolaClientOptions): HolaClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const requestFetch = options.fetch ?? globalThis.fetch
  let observedSourceToken: string | null | undefined
  let refreshedAccessToken: string | undefined
  let refreshInFlight: Promise<void> | undefined

  if (!requestFetch) throw new Error('Fetch API tidak tersedia di lingkungan ini.')

  const accessToken = async (): Promise<string | null> => {
    const sourceToken = await options.getAccessToken()
    if (sourceToken !== observedSourceToken) {
      observedSourceToken = sourceToken
      refreshedAccessToken = undefined
    }
    return refreshedAccessToken ?? sourceToken
  }

  const invokeUnauthorized = async (): Promise<void> => {
    try {
      await options.onUnauthorized()
    } catch {
      // Navigasi/cleanup pemanggil tidak boleh menyamarkan error API asli.
    }
  }

  const fetchWithAccessToken = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const headers = new Headers(init?.headers)
    const token = await accessToken()
    headers.delete('authorization')
    if (token) headers.set('authorization', `Bearer ${token}`)

    return requestFetch(input, {
      ...init,
      credentials: init?.credentials ?? 'include',
      headers,
    })
  }

  const refreshAccessToken = async (): Promise<void> => {
    let response: Response
    try {
      response = await requestFetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      await invokeUnauthorized()
      throw error
    }

    if (!response.ok) {
      const error = await toHolaApiError(response)
      await invokeUnauthorized()
      throw error
    }

    const body = await parseJson(response)
    if (!isRefreshEnvelope(body)) {
      const error = new HolaApiError({
        status: 502,
        code: 'INTERNAL_ERROR',
        message: 'Respons refresh sesi tidak dapat diproses.',
        details: undefined,
        requestId: response.headers.get('x-request-id') ?? undefined,
      })
      await invokeUnauthorized()
      throw error
    }

    refreshedAccessToken = body.data.access_token
  }

  const refreshSingleFlight = (): Promise<void> => {
    if (refreshInFlight) return refreshInFlight

    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = undefined
    })
    return refreshInFlight
  }

  const authenticatedFetch: typeof fetch = async (input, init) => {
    const response = await fetchWithAccessToken(input, init)
    if (response.ok) return response

    const error = await toHolaApiError(response)
    if (error.status !== 401 || error.code !== 'TOKEN_EXPIRED') throw error

    await refreshSingleFlight()
    const replay = await fetchWithAccessToken(input, init)
    if (replay.ok) return replay
    throw await toHolaApiError(replay)
  }

  return hc<AppType>(baseUrl, { fetch: authenticatedFetch })
}
