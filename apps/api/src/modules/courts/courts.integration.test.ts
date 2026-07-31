import {
  courtPhotos,
  courts,
  mediaFiles,
  priceRules,
  specialDates,
  sports,
  users,
  venues,
} from '@hola/db'
import { createRedisKeys } from '@hola/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { logger } from '../../config/logger.ts'
import { redis, safeRedis } from '../../config/redis.ts'
import {
  createAdminPriceRule,
  deleteAdminPriceRule,
  patchAdminPriceRule,
} from '../pricing/price-rules.service.ts'
import { patchAdminCourt, replaceAdminCourtPhotos } from './courts.service.ts'
import { createAdminSpecialDate, deleteAdminSpecialDate } from './special-dates.service.ts'

const ids = {
  user: '01920000-0000-7000-8000-000000000101',
  venue: '01920000-0000-7000-8000-000000000102',
  sport: '01920000-0000-7000-8000-000000000103',
  court: '01920000-0000-7000-8000-000000000104',
  mediaOne: '01920000-0000-7000-8000-000000000105',
  mediaTwo: '01920000-0000-7000-8000-000000000106',
} as const

const now = new Date('2026-07-31T00:00:00.000Z')
const redisKeys = createRedisKeys('local')
const actor = {
  role: 'admin' as const,
  userId: ids.user,
  cafeTenantId: undefined,
  employeeId: undefined,
}
const audit = { actor, requestId: 'court-test', ipAddress: undefined, userAgent: undefined }
const redisContext = { db, redis, redisKeys, safeRedis, logger }

async function cleanFixtures(): Promise<void> {
  await db.delete(courtPhotos).where(eq(courtPhotos.courtId, ids.court))
  await db.delete(priceRules).where(eq(priceRules.courtId, ids.court))
  await db.delete(specialDates).where(eq(specialDates.date, '2026-08-01'))
  await db.delete(mediaFiles).where(eq(mediaFiles.id, ids.mediaOne))
  await db.delete(mediaFiles).where(eq(mediaFiles.id, ids.mediaTwo))
  await db.delete(courts).where(eq(courts.id, ids.court))
  await db.delete(sports).where(eq(sports.id, ids.sport))
  await db.delete(venues).where(eq(venues.id, ids.venue))
  await db.delete(users).where(eq(users.id, ids.user))
  await redis.del(redisKeys.availability(ids.court, '2026-08-01'))
}

async function insertFixtures(): Promise<void> {
  await db.insert(users).values({
    id: ids.user,
    role: 'admin',
    email: 'courts.admin@example.test',
    fullName: 'Court Admin',
  })
  await db.insert(venues).values({ id: ids.venue, name: 'Court fixture venue' })
  await db.insert(sports).values({ id: ids.sport, code: 'COURT', name: 'Court fixture sport' })
  await db.insert(courts).values({
    id: ids.court,
    venueId: ids.venue,
    sportId: ids.sport,
    code: 'COURT-01',
    name: 'Court fixture',
  })
  await db.insert(mediaFiles).values([
    {
      id: ids.mediaOne,
      bucket: 'hola-media',
      objectKey: 'fixtures/court-one.jpg',
      kind: 'court_photo',
      status: 'ready',
    },
    {
      id: ids.mediaTwo,
      bucket: 'hola-media',
      objectKey: 'fixtures/court-two.jpg',
      kind: 'court_photo',
      status: 'ready',
    },
  ])
}

beforeEach(async () => {
  await cleanFixtures()
  await insertFixtures()
})

afterAll(cleanFixtures)

describe('admin court, harga, dan special dates dengan PostgreSQL/Redis nyata', () => {
  it('P1-26 / S-4: PATCH memakai optimistic locking dan menaikkan version', async () => {
    const court = await patchAdminCourt(
      { ...redisContext, now, ...audit },
      { courtId: ids.court, version: 1, patch: { name: 'Court fixture updated' } },
    )

    expect(court).toMatchObject({ name: 'Court fixture updated', version: 2 })
    await expect(
      patchAdminCourt(
        { ...redisContext, now, ...audit },
        { courtId: ids.court, version: 1, patch: { name: 'Stale write' } },
      ),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' })
  })

  it('P1-27: mengganti daftar foto secara atomik dan mempertahankan urutan', async () => {
    await replaceAdminCourtPhotos({ ...redisContext, now, ...audit }, ids.court, {
      media_ids: [ids.mediaTwo, ids.mediaOne],
    })

    const rows = await db.select().from(courtPhotos).where(eq(courtPhotos.courtId, ids.court))
    expect(rows.sort((a, b) => a.position - b.position).map((row) => row.mediaId)).toEqual([
      ids.mediaTwo,
      ids.mediaOne,
    ])
  })

  it('P1-28 / I-7: perubahan price rule menghapus seluruh cache availability', async () => {
    await redis.set(redisKeys.availability(ids.court, '2026-08-01'), 'cache', 'EX', 60)
    const rule = await createAdminPriceRule(
      { ...redisContext, ...audit },
      {
        court_id: ids.court,
        day_type: 'weekday',
        starts_time: '08:00',
        ends_time: '09:00',
        rate_class: 'offpeak',
        price_per_hour_amount: 150_000,
        priority: 0,
        is_active: true,
      },
    )

    expect(await redis.get(redisKeys.availability(ids.court, '2026-08-01'))).toBeNull()
    const patched = await patchAdminPriceRule({ ...redisContext, ...audit }, rule.id, {
      is_active: false,
    })
    expect(patched.isActive).toBe(false)
    await expect(
      deleteAdminPriceRule({ ...redisContext, ...audit }, rule.id),
    ).resolves.toBeUndefined()
  })

  it('P1-29 / I-10: tambah dan hapus special date menghapus cache untuk tanggal terkait', async () => {
    await redis.set(redisKeys.availability(ids.court, '2026-08-01'), 'cache', 'EX', 60)
    const specialDate = await createAdminSpecialDate(
      { ...redisContext, ...audit },
      {
        date: '2026-08-01',
        name: 'Hari libur fixture',
        day_type_override: 'holiday',
        is_closed: true,
      },
    )

    expect(await redis.get(redisKeys.availability(ids.court, '2026-08-01'))).toBeNull()
    await redis.set(redisKeys.availability(ids.court, '2026-08-01'), 'cache', 'EX', 60)
    await deleteAdminSpecialDate({ ...redisContext, ...audit }, specialDate.id)
    expect(await redis.get(redisKeys.availability(ids.court, '2026-08-01'))).toBeNull()
  })
})
