import { customerProfiles, sports, users } from '@hola/db'
import { USER_ROLE } from '@hola/shared'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { db } from '../../config/db.ts'
import { env } from '../../env.ts'
import { issueAccessToken } from '../auth/jwt.ts'

const ids = {
  owner: '01930000-0000-7000-8000-0000000003a1',
  neighbour: '01930000-0000-7000-8000-0000000003a2',
  staff: '01930000-0000-7000-8000-0000000003a3',
  sport: '01930000-0000-7000-8000-0000000003b1',
} as const

const USER_IDS = [ids.owner, ids.neighbour, ids.staff]

interface ProfileBody {
  data: {
    full_name: string
    phone: string | null
    profile: {
      birth_date: string | null
      gender: string | null
      skill_level: string | null
      preferred_sport_id: string | null
      notification_prefs: { push: boolean; email: boolean; whatsapp: boolean }
    } | null
  }
}

async function cleanFixtures(): Promise<void> {
  await db.delete(customerProfiles).where(inArray(customerProfiles.userId, USER_IDS))
  await db.delete(users).where(inArray(users.id, USER_IDS))
  await db.delete(sports).where(eq(sports.id, ids.sport))
}

async function bearer(userId: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new Error('fixture user hilang')
  const issued = await issueAccessToken(
    { id: user.id, role: user.role, tokenVersion: user.tokenVersion },
    env,
  )
  return `Bearer ${issued.token}`
}

beforeEach(async () => {
  await cleanFixtures()
  await db.insert(sports).values({
    id: ids.sport,
    code: 'SPORT-PROFILE',
    name: 'Padel fixture profil',
    sortOrder: 1,
    isActive: true,
  })
  await db.insert(users).values([
    {
      id: ids.owner,
      role: USER_ROLE.CUSTOMER,
      email: 'owner.profile-test@hola.test',
      phone: '+628110000001',
      fullName: 'Pemilik Profil',
      passwordHash: 'x',
    },
    {
      id: ids.neighbour,
      role: USER_ROLE.CUSTOMER,
      email: 'neighbour.profile-test@hola.test',
      phone: '+628110000002',
      fullName: 'Tetangga Profil',
      passwordHash: 'x',
    },
    {
      id: ids.staff,
      role: USER_ROLE.STAFF,
      email: 'staff.profile-test@hola.test',
      fullName: 'Staf Profil',
      passwordHash: 'x',
    },
  ])
  await db.insert(customerProfiles).values([
    { userId: ids.owner, referralCode: 'PRF001' },
    { userId: ids.neighbour, referralCode: 'PRF002' },
  ])
})

afterAll(cleanFixtures)

describe('GET/PATCH /me/profile', () => {
  it('mengembalikan identitas dan profil pelanggan milik sendiri', async () => {
    const response = await app.request('/api/v1/me/profile', {
      headers: { authorization: await bearer(ids.owner) },
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as ProfileBody
    expect(body.data.full_name).toBe('Pemilik Profil')
    expect(body.data.profile?.notification_prefs).toEqual({
      push: true,
      email: true,
      whatsapp: false,
    })
  })

  it('menyimpan perubahan nama, tanggal lahir, dan olahraga favorit', async () => {
    const response = await app.request('/api/v1/me/profile', {
      method: 'PATCH',
      headers: {
        authorization: await bearer(ids.owner),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        full_name: 'Pemilik Profil Baru',
        birth_date: '1997-06-12',
        gender: 'undisclosed',
        skill_level: 'intermediate',
        preferred_sport_id: ids.sport,
      }),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as ProfileBody
    expect(body.data.full_name).toBe('Pemilik Profil Baru')
    expect(body.data.profile?.birth_date).toBe('1997-06-12')
    expect(body.data.profile?.preferred_sport_id).toBe(ids.sport)
  })

  it('menolak nomor HP yang sudah dipakai akun lain dengan 409, bukan 500', async () => {
    const response = await app.request('/api/v1/me/profile', {
      method: 'PATCH',
      headers: {
        authorization: await bearer(ids.owner),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ phone: '+628110000002' }),
    })

    expect(response.status).toBe(409)
  })

  // `ck_users_identifier`: akun tanpa email tidak boleh kehilangan nomor HP-nya.
  it('menolak mengosongkan nomor HP saat akun tidak punya email', async () => {
    await db
      .update(users)
      .set({ email: null, phone: '+628110000003' })
      .where(eq(users.id, ids.owner))

    const response = await app.request('/api/v1/me/profile', {
      method: 'PATCH',
      headers: {
        authorization: await bearer(ids.owner),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ phone: null }),
    })

    expect(response.status).toBe(422)
  })

  it('staff tanpa baris customer_profiles ditolak saat mengubah field olahraga', async () => {
    const authorization = await bearer(ids.staff)

    const read = await app.request('/api/v1/me/profile', { headers: { authorization } })
    expect(read.status).toBe(200)
    expect(((await read.json()) as ProfileBody).data.profile).toBeNull()

    const write = await app.request('/api/v1/me/profile', {
      method: 'PATCH',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({ skill_level: 'advanced' }),
    })
    expect(write.status).toBe(403)
  })
})

describe('PUT /me/notification-prefs', () => {
  it('mengganti seluruh objek preferensi', async () => {
    const response = await app.request('/api/v1/me/notification-prefs', {
      method: 'PUT',
      headers: {
        authorization: await bearer(ids.owner),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ push: false, email: false, whatsapp: true }),
    })

    expect(response.status).toBe(200)
    const [row] = await db
      .select({ prefs: customerProfiles.notificationPrefs })
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, ids.owner))
    expect(row?.prefs).toEqual({ push: false, email: false, whatsapp: true })
  })
})
