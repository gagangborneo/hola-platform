import { describe, expect, it } from 'vitest'
import { createMemoryAuthStore } from './auth-store.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('memory admin auth store', () => {
  it('F0-74 / S-5: sesi admin direstore dari cookie tanpa menyimpan token persisten', async () => {
    const store = createMemoryAuthStore({
      apiBaseUrl: 'https://api.hola.test/',
      fetch: async (_input, init): Promise<Response> => {
        expect(init?.credentials).toBe('include')
        expect(init?.method).toBe('POST')
        return json({
          data: {
            access_token: 'admin-token',
            user: {
              id: '018f0000-0000-7000-8000-000000000001',
              role: 'admin',
              email: 'admin@hola.test',
              full_name: 'Admin Hola',
            },
          },
        })
      },
    })

    await expect(store.restoreSession()).resolves.toBe('admin-token')
    expect(store.getSnapshot()).toEqual({
      accessToken: 'admin-token',
      isReady: true,
      user: {
        id: '018f0000-0000-7000-8000-000000000001',
        role: 'admin',
        email: 'admin@hola.test',
        fullName: 'Admin Hola',
      },
    })
  })

  it('F0-74: sesi customer ditolak oleh guard UX back-office', async () => {
    const store = createMemoryAuthStore({
      apiBaseUrl: 'https://api.hola.test',
      fetch: async (): Promise<Response> =>
        json({
          data: {
            access_token: 'customer-token',
            user: {
              id: '018f0000-0000-7000-8000-000000000002',
              role: 'customer',
              email: 'customer@hola.test',
              full_name: 'Customer Hola',
            },
          },
        }),
    })

    await expect(store.restoreSession()).resolves.toBeNull()
    expect(store.getSnapshot()).toEqual({ accessToken: null, isReady: true, user: null })
  })
})
