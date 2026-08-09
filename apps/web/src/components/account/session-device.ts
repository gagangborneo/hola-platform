/**
 * Nama perangkat yang terbaca manusia dari satu baris `GET /auth/sessions`.
 *
 * API sengaja tidak menyimpan nama perangkat yang cantik: yang tercatat adalah
 * header `X-Client-Platform` (kalau ada) dan `User-Agent` mentah. Menerjemahkan
 * di sini — bukan di server — menjaga audit tetap memegang string aslinya.
 */

const BROWSERS: ReadonlyArray<readonly [pattern: string, label: string]> = [
  // Urutannya penting: Edge dan Chrome sama-sama menulis "Chrome" di UA-nya,
  // dan Chrome menulis "Safari". Yang paling spesifik harus diperiksa lebih dulu.
  ['Edg/', 'Edge'],
  ['OPR/', 'Opera'],
  ['Firefox/', 'Firefox'],
  ['Chrome/', 'Chrome'],
  ['Safari/', 'Safari'],
]

const PLATFORMS: ReadonlyArray<readonly [pattern: string, label: string]> = [
  ['iPhone', 'iPhone'],
  ['iPad', 'iPad'],
  ['Android', 'Android'],
  ['Windows', 'Windows'],
  ['Mac OS X', 'macOS'],
  ['Linux', 'Linux'],
]

const CLIENT_PLATFORM_LABEL: Record<string, string> = {
  web: 'Peramban web',
  'mobile-ios': 'Aplikasi iOS',
  'mobile-android': 'Aplikasi Android',
  admin: 'Panel admin',
}

function match(
  source: string,
  table: ReadonlyArray<readonly [string, string]>,
): string | undefined {
  return table.find(([pattern]) => source.includes(pattern))?.[1]
}

export function sessionDeviceName(session: {
  device_label: string | null
  user_agent: string | null
}): string {
  const labelled = session.device_label ? CLIENT_PLATFORM_LABEL[session.device_label] : undefined
  if (labelled) return labelled

  const userAgent = session.user_agent ?? ''
  const browser = match(userAgent, BROWSERS)
  const platform = match(userAgent, PLATFORMS)
  if (browser && platform) return `${browser} di ${platform}`
  if (browser) return browser
  if (platform) return platform
  return session.device_label ?? 'Perangkat tidak dikenal'
}
