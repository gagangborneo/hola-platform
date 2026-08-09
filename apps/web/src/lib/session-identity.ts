import type { AuthenticatedUser } from './auth-store.ts'

/**
 * Satu sumber kebenaran untuk cara akun ditampilkan di header dan sidebar akun,
 * supaya tombol identitas di header tidak pernah menyebut orang yang sama dengan
 * label berbeda dari kartu profil di halaman akun.
 */

/** Email lebih dulu, lalu nomor HP — persis urutan yang dipakai form login. */
export function accountIdentity(user: AuthenticatedUser | null): string | null {
  if (!user) return null
  return user.email ?? user.phone ?? null
}

export function accountDisplayName(user: AuthenticatedUser | null): string {
  const name = user?.fullName.trim()
  if (name) return name
  return accountIdentity(user) ?? 'Akun saya'
}

/**
 * Label tombol header: identitas (email/HP) adalah yang dicari pengguna untuk
 * memastikan ia masuk sebagai akun yang benar; nama hanya cadangan.
 */
export function accountIdentityLabel(user: AuthenticatedUser | null): string {
  return accountIdentity(user) ?? accountDisplayName(user)
}

/**
 * Maksimal dua huruf supaya muat di lingkaran avatar pada semua ukuran layar.
 * Bagian domain email dibuang lebih dulu — "pemain@hola.test" berinisial "P",
 * bukan "PT" dari "pemain" + "test".
 */
export function accountInitials(user: AuthenticatedUser | null): string {
  const source = user?.fullName.trim() || accountIdentity(user)?.split('@')[0] || ''
  const initials = source
    .split(/[\s._-]+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
  // Akun yang hanya punya nomor HP akan menghasilkan angka; huruf netral lebih terbaca.
  return /\p{L}/u.test(initials) ? initials.toUpperCase() : 'A'
}
