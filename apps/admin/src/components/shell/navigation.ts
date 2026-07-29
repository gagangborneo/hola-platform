import type { AdminRole } from '../../lib/auth.ts'

export interface NavigationItem {
  href: string
  label: string
  roles: readonly AdminRole[]
}

const navigation: readonly NavigationItem[] = [
  { href: '/dashboard', label: 'Ringkasan', roles: ['admin', 'staff', 'tenant'] },
  { href: '/dashboard/bookings', label: 'Jadwal & booking', roles: ['admin', 'staff'] },
  { href: '/dashboard/users', label: 'Pengguna', roles: ['admin'] },
  { href: '/dashboard/settings', label: 'Pengaturan', roles: ['admin'] },
  { href: '/dashboard/audit-logs', label: 'Audit log', roles: ['admin'] },
  { href: '/dashboard/contracts', label: 'Kontrak & tagihan', roles: ['tenant'] },
]

export function navigationForRole(role: AdminRole): NavigationItem[] {
  return navigation.filter((item) => item.roles.includes(role))
}
