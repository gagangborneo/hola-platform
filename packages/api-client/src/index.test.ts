import { describe, expect, it, vi } from 'vitest'
import { createHolaClient, HolaApiError } from './index.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input.toString()
}

function loginRequest(client: ReturnType<typeof createHolaClient>) {
  return client.api.v1.auth.login.$post({
    json: { identifier: 'customer@hola.test', password: 'correct-horse-battery-staple' },
  })
}

describe('createHolaClient', () => {
  it('F0-64: memetakan envelope error API menjadi HolaApiError', async () => {
    const fetchMock = async (): Promise<Response> =>
      json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Anda tidak memiliki akses ke tindakan ini.',
            request_id: 'req-forbidden',
          },
        },
        403,
      )
    const client = createHolaClient({
      baseUrl: 'https://api.hola.test',
      getAccessToken: () => 'access-token',
      onUnauthorized: vi.fn(),
      fetch: fetchMock,
    })

    await expect(loginRequest(client)).rejects.toMatchObject({
      name: 'HolaApiError',
      status: 403,
      code: 'FORBIDDEN',
      requestId: 'req-forbidden',
    })
  })

  it('F0-65 / T-12 / RK-0-03: tiga 401 paralel hanya melakukan satu refresh', async () => {
    let refreshCalls = 0
    let protectedCalls = 0
    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = urlOf(input)
      if (url.endsWith('/api/v1/auth/refresh')) {
        refreshCalls += 1
        expect(init?.method).toBe('POST')
        expect(init?.credentials).toBe('include')
        return json({ data: { access_token: 'refreshed-access-token' } })
      }

      protectedCalls += 1
      const authorization = new Headers(init?.headers).get('authorization')
      if (authorization === 'Bearer expired-access-token') {
        return json(
          {
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Sesi Anda telah berakhir. Silakan coba lagi.',
              request_id: `req-expired-${protectedCalls}`,
            },
          },
          401,
        )
      }
      return json({ data: [] })
    }
    const client = createHolaClient({
      baseUrl: 'https://api.hola.test/',
      getAccessToken: () => 'expired-access-token',
      onUnauthorized: vi.fn(),
      fetch: fetchMock,
    })

    const responses = await Promise.all([
      loginRequest(client),
      loginRequest(client),
      loginRequest(client),
    ])

    expect(refreshCalls).toBe(1)
    expect(protectedCalls).toBe(6)
    expect(await responses[0]?.json()).toEqual({ data: [] })
  })

  it('F0-65: refresh gagal memanggil onUnauthorized sekali untuk seluruh request paralel', async () => {
    const onUnauthorized = vi.fn()
    let refreshCalls = 0
    const fetchMock = async (input: RequestInfo | URL): Promise<Response> => {
      if (urlOf(input).endsWith('/api/v1/auth/refresh')) {
        refreshCalls += 1
        return json(
          {
            error: {
              code: 'UNAUTHENTICATED',
              message: 'Anda perlu masuk untuk melanjutkan.',
              request_id: 'req-refresh-failed',
            },
          },
          401,
        )
      }
      return json(
        {
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Sesi Anda telah berakhir. Silakan coba lagi.',
            request_id: 'req-expired',
          },
        },
        401,
      )
    }
    const client = createHolaClient({
      baseUrl: 'https://api.hola.test',
      getAccessToken: () => 'expired-access-token',
      onUnauthorized,
      fetch: fetchMock,
    })

    await expect(
      Promise.all([loginRequest(client), loginRequest(client), loginRequest(client)]),
    ).rejects.toBeInstanceOf(HolaApiError)

    expect(refreshCalls).toBe(1)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
