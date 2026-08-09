import { describe, expect, it } from 'vitest'
import { createMemoryAuthStore } from './auth-store.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('memory auth store', () => {
  it('F0-70 / S-5: token hanya berada di store memori dan refresh memakai cookie', async () => {
    let refreshCalls = 0
    const store = createMemoryAuthStore({
      apiBaseUrl: 'https://api.hola.test/',
      fetch: async (_input, init): Promise<Response> => {
        refreshCalls += 1
        expect(init?.credentials).toBe('include')
        expect(init?.method).toBe('POST')
        return json({ data: { access_token: 'refreshed-token' } })
      },
    })

    const [first, second] = await Promise.all([store.restoreSession(), store.restoreSession()])

    expect(first).toBe('refreshed-token')
    expect(second).toBe('refreshed-token')
    expect(refreshCalls).toBe(1)
    expect(store.getAccessToken()).toBe('refreshed-token')
    store.clearAccessToken()
    expect(store.getAccessToken()).toBeNull()
  })

  it('identitas akun ikut dipulihkan dari refresh, bukan hanya dari login', async () => {
    const store = createMemoryAuthStore({
      apiBaseUrl: 'https://api.hola.test',
      fetch: async (): Promise<Response> =>
        json({
          data: {
            access_token: 'refreshed-token',
            user: {
              id: 'user-1',
              role: 'customer',
              email: 'pemain@hola.test',
              phone: null,
              full_name: 'Pemain Hola',
            },
          },
        }),
    })

    await store.restoreSession()

    expect(store.getSnapshot().user).toEqual({
      id: 'user-1',
      role: 'customer',
      email: 'pemain@hola.test',
      phone: null,
      fullName: 'Pemain Hola',
    })
  })

  it('sesi tanpa `user` tetap sah — identitas hanya untuk tampilan', async () => {
    const store = createMemoryAuthStore({
      apiBaseUrl: 'https://api.hola.test',
      fetch: async (): Promise<Response> => json({ data: { access_token: 'refreshed-token' } }),
    })

    await expect(store.restoreSession()).resolves.toBe('refreshed-token')
    expect(store.getSnapshot().user).toBeNull()
  })

  it('F0-70: refresh gagal tidak meninggalkan token lama di memori', async () => {
    const store = createMemoryAuthStore({
      apiBaseUrl: 'https://api.hola.test',
      fetch: async (): Promise<Response> => json({ error: {} }, 401),
    })
    store.setSession({ accessToken: 'stale-token', user: null })

    await expect(store.restoreSession()).resolves.toBeNull()
    expect(store.getSnapshot()).toEqual({ accessToken: null, isReady: true, user: null })
  })
})
