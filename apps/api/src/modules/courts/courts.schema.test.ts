import { describe, expect, it } from 'vitest'
import { createCourtSchema } from './courts.schema.ts'

const validFields = {
  venue_id: '01920000-0000-7000-8000-000000000102',
  sport_id: '01920000-0000-7000-8000-000000000103',
  code: 'COURT-01',
  name: 'Lapangan 1',
}

describe('D1: createCourtSchema menolak code yang bisa memecah segmen URL /lapangan/[kode]', () => {
  it('menerima code alfanumerik dengan "_" dan "-"', () => {
    const result = createCourtSchema.safeParse({ ...validFields, code: 'PDL_01-a' })
    expect(result.success).toBe(true)
  })

  it('menolak code yang mengandung "/"', () => {
    const result = createCourtSchema.safeParse({ ...validFields, code: 'PDL/01' })
    expect(result.success).toBe(false)
  })

  it('menolak code yang mengandung spasi atau simbol lain', () => {
    expect(createCourtSchema.safeParse({ ...validFields, code: 'PDL 01' }).success).toBe(false)
    expect(createCourtSchema.safeParse({ ...validFields, code: 'PDL#01' }).success).toBe(false)
  })
})
