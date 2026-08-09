/** Query profil milik sendiri. Business rule berada di profile.service.ts. */
import { customerProfiles, type HolaDb, sports, users } from '@hola/db'
import type { NotificationPrefs } from '@hola/shared'
import { eq } from 'drizzle-orm'
import { translateDbError } from '../../lib/errors.ts'
import type { Tx } from '../../lib/transaction.ts'

type DbExecutor = HolaDb | Tx

export type ProfileUser = typeof users.$inferSelect
export type CustomerProfile = typeof customerProfiles.$inferSelect

export interface MyProfileRow {
  user: ProfileUser
  /** `null` untuk role non-`customer`: baris `customer_profiles` hanya dibuat saat registrasi customer. */
  profile: CustomerProfile | null
}

async function translate<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw translateDbError(error)
  }
}

export async function findMyProfile(db: DbExecutor, userId: string): Promise<MyProfileRow | null> {
  const [row] = await db
    .select({ user: users, profile: customerProfiles })
    .from(users)
    .leftJoin(customerProfiles, eq(customerProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1)
  return row ?? null
}

export async function sportExists(db: DbExecutor, sportId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: sports.id })
    .from(sports)
    .where(eq(sports.id, sportId))
    .limit(1)
  return row !== undefined
}

/**
 * Mengganti nomor HP MENGOSONGKAN `phone_verified_at`: nomor baru belum pernah
 * dibuktikan milik pemegang akun, dan membiarkan penanda lama akan membuat
 * nomor yang tak terverifikasi tampak terverifikasi.
 */
export async function updateUserIdentity(
  db: DbExecutor,
  input: {
    userId: string
    fullName: string | undefined
    phone: { value: string | null } | undefined
    now: Date
  },
): Promise<void> {
  if (input.fullName === undefined && input.phone === undefined) return
  await translate(async () => {
    await db
      .update(users)
      .set({
        ...(input.fullName === undefined ? {} : { fullName: input.fullName }),
        ...(input.phone === undefined ? {} : { phone: input.phone.value, phoneVerifiedAt: null }),
        updatedAt: input.now,
      })
      .where(eq(users.id, input.userId))
  })
}

export interface CustomerProfileFields {
  birthDate?: string | null
  gender?: string | null
  skillLevel?: string | null
  preferredSportId?: string | null
}

/**
 * Mengembalikan `false` bila user tidak punya baris `customer_profiles` —
 * caller yang memutuskan artinya, karena field profil olahraga memang hanya
 * ada untuk role `customer`.
 */
export async function updateCustomerProfileFields(
  db: DbExecutor,
  input: { userId: string; fields: CustomerProfileFields; now: Date },
): Promise<boolean> {
  if (Object.keys(input.fields).length === 0) return true
  return translate(async () => {
    const [row] = await db
      .update(customerProfiles)
      .set({ ...input.fields, updatedAt: input.now })
      .where(eq(customerProfiles.userId, input.userId))
      .returning({ userId: customerProfiles.userId })
    return row !== undefined
  })
}

export async function updateNotificationPrefs(
  db: DbExecutor,
  input: { userId: string; prefs: NotificationPrefs; now: Date },
): Promise<boolean> {
  const [row] = await db
    .update(customerProfiles)
    .set({ notificationPrefs: input.prefs, updatedAt: input.now })
    .where(eq(customerProfiles.userId, input.userId))
    .returning({ userId: customerProfiles.userId })
  return row !== undefined
}
