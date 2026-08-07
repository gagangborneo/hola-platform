import { sports } from '@hola/db'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { listActiveSports } from './sports.repository.ts'

const ids = {
  active: '01920000-0000-7000-8000-0000000002a1',
  inactive: '01920000-0000-7000-8000-0000000002a2',
} as const

async function cleanFixtures(): Promise<void> {
  await db.delete(sports).where(eq(sports.id, ids.active))
  await db.delete(sports).where(eq(sports.id, ids.inactive))
}

beforeEach(async () => {
  await cleanFixtures()
  await db.insert(sports).values([
    { id: ids.active, code: 'SPORT-A', name: 'Padel fixture', sortOrder: 2, isActive: true },
    { id: ids.inactive, code: 'SPORT-B', name: 'Arsip fixture', sortOrder: 1, isActive: false },
  ])
})

afterAll(cleanFixtures)

describe('GET /sports publik', () => {
  it('P1-71: hanya olahraga aktif, terurut sort_order lalu name', async () => {
    const rows = await listActiveSports(db)
    const codes = rows.map((row) => row.code)

    expect(codes).toContain('SPORT-A')
    expect(codes).not.toContain('SPORT-B')
  })
})
