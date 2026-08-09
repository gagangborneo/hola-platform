import type { AdminRole } from '../../lib/auth.ts'

export interface NavigationItem {
  href: string
  label: string
  roles: readonly AdminRole[]
}

/**
 * Urutan mengikuti alur kerja harian: apa yang terjadi hari ini dulu, lalu
 * jadwal, transaksi, dan terakhir konfigurasi. Peran hanya menyembunyikan
 * tautan — API tetap memverifikasi JWT dan RBAC pada setiap request.
 */
const navigation: readonly NavigationItem[] = [
  { href: '/dashboard', label: 'Hari ini', roles: ['admin', 'staff', 'tenant'] },
  { href: '/dashboard/schedule', label: 'Jadwal slot', roles: ['admin', 'staff'] },
  { href: '/dashboard/bookings', label: 'Booking', roles: ['admin', 'staff'] },
  { href: '/dashboard/payments', label: 'Pembayaran & refund', roles: ['admin', 'staff'] },
  { href: '/dashboard/maintenance', label: 'Blokir lapangan', roles: ['admin', 'staff'] },
  { href: '/dashboard/customers', label: 'Customer', roles: ['admin'] },
  { href: '/dashboard/courts', label: 'Lapangan', roles: ['admin'] },
  { href: '/dashboard/price-rules', label: 'Aturan harga', roles: ['admin'] },
  { href: '/dashboard/vouchers', label: 'Voucher', roles: ['admin'] },
  { href: '/dashboard/users', label: 'Pengguna', roles: ['admin'] },
  { href: '/dashboard/settings', label: 'Pengaturan', roles: ['admin'] },
  { href: '/dashboard/audit-logs', label: 'Audit log', roles: ['admin'] },
  { href: '/dashboard/contracts', label: 'Kontrak & tagihan', roles: ['tenant'] },
]

export function navigationForRole(role: AdminRole): NavigationItem[] {
  return navigation.filter((item) => item.roles.includes(role))
}
