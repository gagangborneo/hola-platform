/** Token opaque dan hash durabel untuk refresh/reset password. */
import { createHash, randomBytes } from 'node:crypto'

/** Token mentah hanya hidup sampai ia dikirim ke client/email. */
export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url')
}

/** SHA-256 cukup untuk token 256-bit acak; tidak ada password user di sini. */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}
