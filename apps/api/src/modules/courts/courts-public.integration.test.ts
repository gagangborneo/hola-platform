import { courtOperatingHours, courtPhotos, courts, mediaFiles, sports, venues } from '@hola/db'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { findCourtDetail, listPublicCourts } from './courts.repository.ts'

const ids = {
  venue: '01920000-0000-7000-8000-0000000002b1',
  sport: '01920000-0000-7000-8000-0000000002b2',
  courtActive: '01920000-0000-7000-8000-0000000002b3',
  courtInactive: '01920000-0000-7000-8000-0000000002b4',
  media: '01920000-0000-7000-8000-0000000002b5',
} as const

async function cleanFixtures(): Promise<void> {
  await db.delete(courtPhotos).where(eq(courtPhotos.courtId, ids.courtActive))
  await db.delete(courtOperatingHours).where(eq(courtOperatingHours.courtId, ids.courtActive))
  await db.delete(mediaFiles).where(eq(mediaFiles.id, ids.media))
  await db.delete(courts).where(eq(courts.id, ids.courtActive))
  await db.delete(courts).where(eq(courts.id, ids.courtInactive))
  await db.delete(sports).where(eq(sports.id, ids.sport))
  await db.delete(venues).where(eq(venues.id, ids.venue))
}

beforeEach(async () => {
  await cleanFixtures()
  await db.insert(venues).values({ id: ids.venue, name: 'Public court venue' })
  await db.insert(sports).values({ id: ids.sport, code: 'PUB', name: 'Public sport' })
  await db.insert(courts).values([
    {
      id: ids.courtActive,
      venueId: ids.venue,
      sportId: ids.sport,
      code: 'PUB-01',
      name: 'Public court aktif',
      status: 'active',
      isIndoor: true,
      sortOrder: 1,
    },
    {
      id: ids.courtInactive,
      venueId: ids.venue,
      sportId: ids.sport,
      code: 'PUB-02',
      name: 'Public court nonaktif',
      status: 'inactive',
      isIndoor: false,
      sortOrder: 2,
    },
  ])
  await db.insert(courtOperatingHours).values({
    courtId: ids.courtActive,
    dayOfWeek: 1,
    opensTime: '08:00',
    closesTime: '22:00',
  })
  await db.insert(mediaFiles).values({
    id: ids.media,
    bucket: 'hola-media',
    objectKey: 'fixtures/public-court.jpg',
    kind: 'court_photo',
    status: 'ready',
  })
  await db.insert(courtPhotos).values({
    courtId: ids.courtActive,
    mediaId: ids.media,
    position: 0,
  })
})

afterAll(cleanFixtures)

describe('endpoint publik lapangan', () => {
  it('P1-72: filter status menyaring lapangan nonaktif', async () => {
    const rows = await listPublicCourts(db, { status: 'active' })
    const codes = rows.map((row) => row.code)

    expect(codes).toContain('PUB-01')
    expect(codes).not.toContain('PUB-02')
  })

  it('P1-72: filter is_indoor dan sport_id dipakai bersama', async () => {
    const rows = await listPublicCourts(db, { sportId: ids.sport, isIndoor: true })

    expect(rows.map((row) => row.code)).toEqual(['PUB-01'])
  })

  it('P1-72: detail memuat jam operasional dan foto siap pakai', async () => {
    const detail = await findCourtDetail(db, ids.courtActive)

    expect(detail?.court.code).toBe('PUB-01')
    expect(detail?.hours).toEqual([{ dayOfWeek: 1, opensTime: '08:00:00', closesTime: '22:00:00' }])
    expect(detail?.photos).toEqual([
      {
        mediaId: ids.media,
        position: 0,
        bucket: 'hola-media',
        objectKey: 'fixtures/public-court.jpg',
      },
    ])
  })

  it('P1-72: id yang tidak ada mengembalikan null, bukan melempar', async () => {
    await expect(findCourtDetail(db, ids.courtInactive)).resolves.toMatchObject({
      photos: [],
      hours: [],
    })
  })
})
