import { apiEnvSchema } from '@hola/shared/env/index'
import { describe, expect, it } from 'vitest'

describe('api env', () => {
  it('F0-32: menerima allowlist webhook kosong sebagai array kosong', () => {
    const parsed = apiEnvSchema.parse({
      ...process.env,
      MIDTRANS_WEBHOOK_ALLOWED_IPS: '',
    })
    expect(parsed.MIDTRANS_WEBHOOK_ALLOWED_IPS).toEqual([])
  })

  it('F0-32: gagal keras secara schema ketika env wajib hilang', () => {
    const candidate = { ...process.env }
    delete candidate.DATABASE_URL
    const parsed = apiEnvSchema.safeParse(candidate)
    expect(parsed.success).toBe(false)
  })

  it('F0-41: token internal wajib terpisah dan minimal 32 karakter', () => {
    const parsed = apiEnvSchema.safeParse({ ...process.env, INTERNAL_TOKEN: 'terlalu-pendek' })
    expect(parsed.success).toBe(false)
  })
})
