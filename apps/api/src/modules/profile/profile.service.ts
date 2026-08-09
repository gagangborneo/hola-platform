/**
 * Profil milik sendiri (docs/04 § 9.12 `/me/profile`, `/me/notification-prefs`).
 *
 * Modul ini sengaja TIDAK menyentuh email: mengganti alamat email berarti
 * mengganti identifier login sekaligus tujuan email verifikasi, jadi alurnya
 * milik modul auth (docs/05 § 8), bukan form profil.
 */
import type { NotificationPrefs, UpdateMyProfileInput } from '@hola/shared'
import { err, UniqueViolationError } from '../../lib/errors.ts'
import { withTransaction } from '../../lib/transaction.ts'
import type { CoreDependencies } from '../../middleware/core-dependencies.ts'
import type { Viewer } from '../auth/auth.types.ts'
import { writeAuditLog } from '../system/audit.repository.ts'
import {
  type CustomerProfileFields,
  findMyProfile,
  type MyProfileRow,
  sportExists,
  updateCustomerProfileFields,
  updateNotificationPrefs,
  updateUserIdentity,
} from './profile.repository.ts'

type ProfileDependencies = Pick<CoreDependencies, 'db' | 'logger'>

export interface ProfileServiceContext extends ProfileDependencies {
  now: Date
}

export interface ProfileRequestContext {
  ipAddress: string | undefined
  userAgent: string | undefined
  requestId: string | undefined
}

const CUSTOMER_ONLY_MESSAGE = 'Data profil olahraga hanya tersedia untuk akun pelanggan.'

/** Field `customer_profiles`; hanya yang benar-benar dikirim yang masuk ke UPDATE. */
function customerProfileFields(input: UpdateMyProfileInput): CustomerProfileFields {
  return {
    ...(input.birth_date === undefined ? {} : { birthDate: input.birth_date }),
    ...(input.gender === undefined ? {} : { gender: input.gender }),
    ...(input.skill_level === undefined ? {} : { skillLevel: input.skill_level }),
    ...(input.preferred_sport_id === undefined
      ? {}
      : { preferredSportId: input.preferred_sport_id }),
  }
}

export async function getMyProfile(
  ctx: Pick<ProfileServiceContext, 'db'>,
  viewer: Viewer,
): Promise<MyProfileRow> {
  const row = await findMyProfile(ctx.db, viewer.userId)
  if (!row) throw err.notFound()
  return row
}

export async function updateMyProfile(
  ctx: ProfileServiceContext,
  viewer: Viewer,
  input: UpdateMyProfileInput,
  request: ProfileRequestContext,
): Promise<MyProfileRow> {
  const current = await findMyProfile(ctx.db, viewer.userId)
  if (!current) throw err.notFound()

  const fields = customerProfileFields(input)
  // Staff/admin tidak punya baris `customer_profiles`; menolak lebih jujur
  // daripada UPDATE yang mengenai nol baris lalu membalas 200 seolah tersimpan.
  if (Object.keys(fields).length > 0 && !current.profile) throw err.forbidden(CUSTOMER_ONLY_MESSAGE)

  if (input.preferred_sport_id && !(await sportExists(ctx.db, input.preferred_sport_id)))
    throw err.validation({ preferred_sport_id: 'Olahraga tidak ditemukan.' })

  // CHECK `ck_users_identifier`: satu akun wajib punya email ATAU nomor HP.
  // Ditolak di sini supaya pesannya menjelaskan sebabnya — kalau dibiarkan
  // sampai PostgreSQL, yang sampai ke pengguna hanya 500 tanpa keterangan.
  if (input.phone === null && current.user.email === null)
    throw err.validation({
      phone: 'Nomor HP tidak dapat dikosongkan karena akun ini tidak punya email.',
    })

  const nextPhone = input.phone === undefined ? undefined : { value: input.phone }
  const phoneChanged = nextPhone !== undefined && nextPhone.value !== current.user.phone

  try {
    await withTransaction(
      ctx.db,
      async ({ tx }) => {
        await updateUserIdentity(tx, {
          userId: viewer.userId,
          fullName: input.full_name,
          phone: nextPhone,
          now: ctx.now,
        })
        await updateCustomerProfileFields(tx, { userId: viewer.userId, fields, now: ctx.now })
        // Nomor HP adalah identifier login (docs/05 § 8) — penggantiannya
        // dicatat, tidak seperti tanggal lahir atau level bermain.
        if (phoneChanged)
          await writeAuditLog(tx, {
            actorUserId: viewer.userId,
            actorRole: viewer.role,
            action: 'profile.phone_changed',
            entityType: 'user',
            entityId: viewer.userId,
            before: { phone: current.user.phone },
            after: { phone: nextPhone.value },
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
            requestId: request.requestId,
          })
      },
      { logger: ctx.logger },
    )
  } catch (error) {
    if (error instanceof UniqueViolationError && error.constraintName === 'uq_users_phone')
      throw err.conflict('Nomor HP itu sudah dipakai akun lain.')
    throw error
  }

  const updated = await findMyProfile(ctx.db, viewer.userId)
  if (!updated) throw err.notFound()
  return updated
}

export async function updateMyNotificationPrefs(
  ctx: Pick<ProfileServiceContext, 'db' | 'now'>,
  viewer: Viewer,
  prefs: NotificationPrefs,
): Promise<NotificationPrefs> {
  const updated = await updateNotificationPrefs(ctx.db, {
    userId: viewer.userId,
    prefs,
    now: ctx.now,
  })
  if (!updated) throw err.forbidden(CUSTOMER_ONLY_MESSAGE)
  return prefs
}
