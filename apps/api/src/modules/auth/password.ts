/** Kebijakan dan operasi password. Sumber: docs/05 § 8. */
import { WEAK_PASSWORDS } from '@hola/shared'
import { argon2id, hash, needsRehash, verify } from 'argon2'
import type { Env } from '../../env.ts'
import { err } from '../../lib/errors.ts'

export const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

function withPepper(password: string, pepper: string): string {
  return `${password}${pepper}`
}

function normalizeComparable(value: string): string {
  return value.trim().toLocaleLowerCase('id-ID')
}

/**
 * Validasi yang membutuhkan context user, sehingga tidak bisa hidup hanya di
 * Zod schema bersama. Pesan sengaja generik agar password tidak masuk log.
 */
export function assertPasswordAllowed(input: {
  password: string
  email: string | undefined
  fullName: string
}): void {
  const password = normalizeComparable(input.password)
  const name = normalizeComparable(input.fullName)
  const email = input.email ? normalizeComparable(input.email) : undefined

  if (WEAK_PASSWORDS.has(password)) {
    throw err.validation({ password: 'Terlalu mudah ditebak' }, 'Gunakan password yang lebih kuat.')
  }
  if (password === name || (email !== undefined && password === email)) {
    throw err.validation(
      { password: 'Tidak boleh sama dengan email atau nama' },
      'Gunakan password yang berbeda dari identitas Anda.',
    )
  }
}

export async function hashPassword(
  password: string,
  env: Pick<Env, 'PASSWORD_PEPPER'>,
): Promise<string> {
  return hash(withPepper(password, env.PASSWORD_PEPPER), ARGON2_OPTIONS)
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
  env: Pick<Env, 'PASSWORD_PEPPER'>,
): Promise<boolean> {
  return verify(passwordHash, withPepper(password, env.PASSWORD_PEPPER))
}

/** Pepper/parameter lama direhash setelah login sukses berikutnya. */
export function passwordNeedsRehash(passwordHash: string): boolean {
  return needsRehash(passwordHash, ARGON2_OPTIONS)
}
