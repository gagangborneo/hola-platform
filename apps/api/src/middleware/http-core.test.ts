import { ERROR_CODE } from '@hola/shared'
import { Hono } from 'hono'
import { isValid } from 'ulid'
import { describe, expect, it } from 'vitest'
import { err } from '../lib/errors.ts'
import { HEADER } from '../lib/response.ts'
import { errorHandler } from './error-handler.ts'
import { type RequestVariables, requestId } from './request-id.ts'

function makeApp(): Hono<{ Variables: RequestVariables }> {
  const app = new Hono<{ Variables: RequestVariables }>()
  app.onError(errorHandler)
  app.use('*', requestId)
  app.get('/ok', (c) => c.json({ data: { now: c.get('now').toISOString() } }))
  app.get('/expected', () => {
    throw err.notFound('Tidak ada.')
  })
  app.get('/bug', () => {
    throw new Error('detail internal rahasia')
  })
  return app
}

describe('request id dan error handler', () => {
  it('F0-38: membuat ULID dan mengembalikannya sebagai X-Request-Id', async () => {
    const response = await makeApp().request('/ok')
    const id = response.headers.get(HEADER.REQUEST_ID) ?? ''
    expect(isValid(id)).toBe(true)
  })

  it('F0-38: mempertahankan incoming request id hanya bila ULID valid', async () => {
    const valid = '01J3Q7Y8M9ABCDEFGHJKMNPQRS'
    const accepted = await makeApp().request('/ok', { headers: { [HEADER.REQUEST_ID]: valid } })
    expect(accepted.headers.get(HEADER.REQUEST_ID)).toBe(valid)

    const rejected = await makeApp().request('/ok', {
      headers: { [HEADER.REQUEST_ID]: 'header-bebas' },
    })
    expect(rejected.headers.get(HEADER.REQUEST_ID)).not.toBe('header-bebas')
  })

  it('BR-SV-04: AppError hanya menjadi envelope HTTP di error-handler', async () => {
    const response = await makeApp().request('/expected')
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: {
        code: ERROR_CODE.NOT_FOUND,
        message: 'Tidak ada.',
      },
    })
  })

  it('F0-35: bug 500 tidak membocorkan detail internal', async () => {
    const response = await makeApp().request('/bug')
    const text = await response.text()
    expect(response.status).toBe(500)
    expect(text).not.toContain('detail internal rahasia')
    expect(JSON.parse(text)).toMatchObject({ error: { code: ERROR_CODE.INTERNAL_ERROR } })
  })
})
