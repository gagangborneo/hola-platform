/**
 * Schema profil milik sendiri.
 * Sumber kebenaran: docs/04-API-CONTRACT.md § 9.12, docs/03-DATA-MODEL.md § 5.
 *
 * Dipakai apps/api untuk validasi request DAN oleh halaman `/akun/profil` di
 * apps/web sebagai schema form yang sama (F0-71, A-09) — aturan panjang nama,
 * format nomor HP, dan daftar nilai gender/level tidak pernah berbeda antara
 * form dan server.
 */
import { z } from 'zod'
import { phone } from './auth.ts'
import { idSchema, isoDate } from './common.ts'

/** `customer_profiles.gender` (docs/03 § 5) — kolom text, bukan enum PostgreSQL. */
export const GENDER_VALUES = ['male', 'female', 'undisclosed'] as const
export type Gender = (typeof GENDER_VALUES)[number]

/** `customer_profiles.skill_level` — dilaporkan sendiri, tidak pernah dinilai sistem. */
export const SKILL_LEVEL_VALUES = ['beginner', 'intermediate', 'advanced'] as const
export type SkillLevel = (typeof SKILL_LEVEL_VALUES)[number]

/**
 * `PATCH /me/profile`.
 *
 * `email` SENGAJA tidak ada di sini. Ia sekaligus identifier login dan alamat
 * tujuan email verifikasi, jadi penggantiannya harus lewat alur verifikasi
 * sendiri (docs/05 § 8) — bukan satu simpanan form profil yang bisa mengunci
 * pemiliknya keluar dari akunnya.
 *
 * `null` berarti "kosongkan field ini"; field yang tidak dikirim tidak diubah.
 */
export const updateMyProfileSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120).optional(),
    phone: phone.nullable().optional(),
    birth_date: isoDate.nullable().optional(),
    gender: z.enum(GENDER_VALUES).nullable().optional(),
    skill_level: z.enum(SKILL_LEVEL_VALUES).nullable().optional(),
    preferred_sport_id: idSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Minimal satu field harus diubah',
  })

/**
 * `PUT /me/notification-prefs` — pengganti seluruh objek, bukan patch parsial:
 * `customer_profiles.notification_prefs` disimpan sebagai satu jsonb sehingga
 * kanal yang hilang dari body akan ambigu antara "tidak diubah" dan "matikan".
 */
export const notificationPrefsSchema = z
  .object({
    push: z.boolean(),
    email: z.boolean(),
    whatsapp: z.boolean(),
  })
  .strict()

export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>

/** Default docs/03 § 5 — dipakai saat kolom jsonb berisi data lama/tak lengkap. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  push: true,
  email: true,
  whatsapp: false,
}
