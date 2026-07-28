/** Proteksi dashboard queue, dipisah agar dapat diuji tanpa membuka server. */
import { timingSafeEqual } from 'node:crypto'

export function bullboardRequestIp(headers: Headers): string | undefined {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded ?? headers.get('x-real-ip') ?? undefined
}

export function isBullboardIpAllowed(
  ip: string | undefined,
  allowedIps: readonly string[],
): boolean {
  if (!ip) return false
  const normalized = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  return allowedIps.includes(normalized)
}

export function isBullboardAuthorized(
  header: string | undefined,
  username: string,
  password: string,
): boolean {
  if (!header?.startsWith('Basic ')) return false
  const expected = Buffer.from(`${username}:${password}`, 'utf8')
  const provided = Buffer.from(header.slice('Basic '.length), 'base64')
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}
