/**
 * Schema request auth.
 * Sumber kebenaran: docs/05-AUTH.md § 5, § 8.
 *
 * Dipakai apps/api untuk validasi request DAN oleh halaman login/daftar di
 * apps/web sebagai schema form yang sama (F0-71, A-09) — pesan validasi di form
 * karena itu tidak pernah berbeda dari yang ditegakkan server.
 */
import { z } from 'zod'
import { PASSWORD_MIN_LENGTH } from '../constants/limits'
import { idSchema } from './common'

// ── Primitif identitas ───────────────────────────────────────────────────────

/** Email disimpan & dibandingkan dalam huruf kecil (UNIQUE email lowercase, C-23). */
export const email = z
  .email()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().max(255))

/** Nomor HP Indonesia dalam bentuk E.164, mis. `+6281234567890`. */
export const phone = z
  .string()
  .trim()
  .regex(/^\+62\d{8,13}$/, 'Nomor HP harus berformat +62…')

/**
 * Password baru.
 *
 * Panjang minimum ditegakkan di sini; dua aturan lain di docs/05 § 8
 * (bukan 10.000 password terlemah, bukan email/nama sendiri) BUTUH konteks
 * server — keduanya diterapkan di apps/api pada F0-43, bukan di schema ini.
 */
export const newPassword = z.string().min(PASSWORD_MIN_LENGTH).max(200)

/** Password saat login: tidak divalidasi kekuatannya, hanya keberadaannya. */
export const currentPassword = z.string().min(1).max(200)

// ── Registrasi & login (docs/05 § 8) ─────────────────────────────────────────

/**
 * `POST /auth/register` — HANYA membuat role `customer`. Role lain dibuat admin
 * lewat `POST /admin/users`.
 *
 * Registrasi memerlukan SALAH SATU dari email atau phone
 * (CHECK `ck_users_identifier`).
 */
export const registerSchema = z
  .object({
    email: email.optional(),
    phone: phone.optional(),
    password: newPassword,
    full_name: z.string().trim().min(1).max(120),
  })
  .refine((v) => v.email !== undefined || v.phone !== undefined, {
    message: 'Wajib mengisi email atau nomor HP',
    path: ['email'],
  })

/** `POST /auth/login`. `identifier` boleh email atau nomor HP (docs/05 § 8). */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: currentPassword,
})

// ── Siklus hidup token (docs/05 § 5) ─────────────────────────────────────────

/**
 * `POST /auth/refresh`. Web mengirim refresh token lewat cookie HttpOnly;
 * mobile mengirimnya di body. Karena itu field-nya opsional di schema dan
 * sumbernya ditentukan di route.
 */
export const refreshSchema = z.object({
  refresh_token: z.string().min(1).optional(),
})

export const revokeSessionParam = z.object({ id: idSchema })

// ── Password (docs/05 § 8) ───────────────────────────────────────────────────

/** `POST /auth/password/forgot` — SELALU membalas 200 (anti-enumerasi). */
export const forgotPasswordSchema = z.object({ email })

/** `POST /auth/password/reset` — token 32 byte, TTL 1 jam, sekali pakai. */
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: newPassword,
})

/** `POST /auth/password/change` — butuh password lama; sesi saat ini disisakan. */
export const changePasswordSchema = z.object({
  current_password: currentPassword,
  new_password: newPassword,
})

// ── Verifikasi email (docs/05 § 8) ───────────────────────────────────────────

export const requestEmailVerificationSchema = z.object({ email: email.optional() })
export const verifyEmailSchema = z.object({ token: z.string().min(1) })

// ── OTP (docs/05 § 8) ────────────────────────────────────────────────────────

/**
 * [D-04] default sementara — lihat docs/00-OVERVIEW.md § 6.
 *
 * Endpoint OTP bertipe lengkap tetapi mengembalikan `403 FEATURE_DISABLED`
 * selama WhatsApp off dan tidak ada provider SMS (docs/05 § 8). Schema-nya tetap
 * ada supaya mobile tidak perlu diubah saat fitur ini dinyalakan.
 */
export const otpRequestSchema = z.object({
  phone,
  purpose: z.enum(['login', 'verify_phone']).default('login'),
})

/** OTP 6 digit numerik, TTL 5 menit, maks 5 percobaan verifikasi. */
export const otpVerifySchema = z.object({
  phone,
  code: z.string().regex(/^\d{6}$/, 'OTP harus 6 digit angka'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type OtpRequestInput = z.infer<typeof otpRequestSchema>
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>
