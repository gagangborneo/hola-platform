import type { AdminRole } from '../../lib/auth.ts'

/**
 * Nama ikon modul. Implementasinya ada di `NavIcon.tsx` — dijaga sebagai union
 * supaya ikon yang belum digambar ketahuan saat typecheck, bukan saat render.
 */
export type NavIconName =
  | 'accounting'
  | 'coaching'
  | 'crm'
  | 'dashboard'
  | 'event'
  | 'finance'
  | 'hr'
  | 'maintenance'
  | 'masterData'
  | 'membership'
  | 'purchasing'
  | 'report'
  | 'sales'
  | 'settings'
  | 'tenant'
  | 'userManagement'

export interface NavigationItem {
  /** Tanpa `href` berarti modul roadmap: tampil sebagai teks, tidak bisa diklik. */
  href?: string
  label: string
  roles: readonly AdminRole[]
}

export interface NavigationGroup {
  icon: NavIconName
  id: string
  items: readonly NavigationItem[]
  label: string
}

const ALL: readonly AdminRole[] = ['admin', 'staff', 'tenant']
const OPS: readonly AdminRole[] = ['admin', 'staff']
const ADMIN: readonly AdminRole[] = ['admin']
const TENANT: readonly AdminRole[] = ['tenant']

/**
 * Peta modul back-office.
 *
 * Item ber-`href` adalah layar yang sudah jalan; sisanya sengaja tanpa `href`
 * sebagai peta modul yang menyusul — nama modulnya mengikuti docs/00-OVERVIEW
 * § 5 dan dokumen modul terkait supaya istilah di sidebar sama dengan istilah
 * di spesifikasi. Peran hanya menyembunyikan tautan; API tetap memverifikasi
 * JWT dan RBAC pada setiap request.
 */
const navigation: readonly NavigationGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    items: [
      { href: '/dashboard/analytics/executive', label: 'Eksekutif', roles: ADMIN },
      { href: '/dashboard', label: 'Operasional hari ini', roles: ALL },
      { href: '/dashboard/analytics/bookings', label: 'Pemesanan', roles: OPS },
      { href: '/dashboard/analytics/membership', label: 'Membership', roles: ADMIN },
      { href: '/dashboard/analytics/finance', label: 'Keuangan', roles: ADMIN },
      { label: 'Okupansi lapangan', roles: ADMIN },
      { label: 'Event & turnamen', roles: ADMIN },
      { label: 'Tenant cafe', roles: ADMIN },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'crm',
    items: [
      { href: '/dashboard/customers', label: 'Customer', roles: ADMIN },
      { label: 'Profil 360°', roles: ADMIN },
      { label: 'Segmentasi & tag', roles: ADMIN },
      { label: 'Catatan internal', roles: ADMIN },
      { label: 'Loyalty & poin', roles: ADMIN },
      { label: 'Tier & badge', roles: ADMIN },
      { label: 'Leaderboard', roles: ADMIN },
      { label: 'Kampanye & broadcast', roles: ADMIN },
      { label: 'Feedback & ulasan', roles: ADMIN },
    ],
  },
  {
    id: 'membership',
    label: 'Membership',
    icon: 'membership',
    items: [
      { label: 'Paket membership', roles: ADMIN },
      { label: 'Member aktif', roles: ADMIN },
      { label: 'Pendaftaran & aktivasi', roles: ADMIN },
      { label: 'Perpanjangan & kedaluwarsa', roles: ADMIN },
      { label: 'Kartu member & QR', roles: ADMIN },
      { label: 'Benefit & kuota main', roles: ADMIN },
      { label: 'Deposit & saldo member', roles: ADMIN },
      { label: 'Riwayat langganan', roles: ADMIN },
      { label: 'Laporan membership', roles: ADMIN },
    ],
  },
  {
    id: 'event',
    label: 'Event',
    icon: 'event',
    items: [
      { label: 'Daftar event', roles: ADMIN },
      { label: 'Kategori event', roles: ADMIN },
      { label: 'Jadwal & kuota', roles: ADMIN },
      { label: 'Registrasi peserta', roles: ADMIN },
      { label: 'Waitlist', roles: ADMIN },
      { label: 'Check-in peserta', roles: ADMIN },
      { label: 'Pembayaran event', roles: ADMIN },
      { label: 'Turnamen & bracket', roles: ADMIN },
      { label: 'Skor & klasemen', roles: ADMIN },
      { label: 'Laporan event', roles: ADMIN },
    ],
  },
  {
    id: 'coaching',
    label: 'Coaching',
    icon: 'coaching',
    items: [
      { label: 'Program & kelas', roles: ADMIN },
      { label: 'Jadwal kelas', roles: ADMIN },
      { label: 'Data pelatih', roles: ADMIN },
      { label: 'Pendaftaran peserta', roles: ADMIN },
      { label: 'Paket sesi & kuota', roles: ADMIN },
      { label: 'Absensi peserta', roles: ADMIN },
      { label: 'Evaluasi & progres', roles: ADMIN },
      { label: 'Sertifikat', roles: ADMIN },
      { label: 'Honor pelatih', roles: ADMIN },
    ],
  },
  {
    id: 'finance',
    label: 'Keuangan',
    icon: 'finance',
    items: [
      { href: '/dashboard/payments', label: 'Pembayaran & refund', roles: OPS },
      { label: 'Kas & bank', roles: ADMIN },
      { label: 'Pemasukan', roles: ADMIN },
      { label: 'Pengeluaran', roles: ADMIN },
      { label: 'Piutang tenant', roles: ADMIN },
      { label: 'Deposit & jaminan', roles: ADMIN },
      { label: 'Rekonsiliasi gateway', roles: ADMIN },
      { label: 'Anggaran', roles: ADMIN },
    ],
  },
  {
    id: 'accounting',
    label: 'Akunting',
    icon: 'accounting',
    items: [
      { label: 'Bagan akun (CoA)', roles: ADMIN },
      { label: 'Jurnal umum', roles: ADMIN },
      { label: 'Buku besar', roles: ADMIN },
      { label: 'Neraca saldo', roles: ADMIN },
      { label: 'Laba rugi', roles: ADMIN },
      { label: 'Neraca', roles: ADMIN },
      { label: 'Arus kas', roles: ADMIN },
      { label: 'Aset tetap & penyusutan', roles: ADMIN },
      { label: 'Tutup buku', roles: ADMIN },
      { label: 'Pajak', roles: ADMIN },
    ],
  },
  {
    id: 'purchasing',
    label: 'Purchasing',
    icon: 'purchasing',
    items: [
      { label: 'Permintaan pembelian', roles: ADMIN },
      { label: 'Purchase order', roles: ADMIN },
      { label: 'Penerimaan barang', roles: ADMIN },
      { label: 'Faktur pembelian', roles: ADMIN },
      { label: 'Supplier', roles: ADMIN },
      { label: 'Persediaan & stok', roles: ADMIN },
      { label: 'Stok opname', roles: ADMIN },
    ],
  },
  {
    id: 'hr',
    label: 'SDM / HRIS',
    icon: 'hr',
    items: [
      { label: 'Data karyawan', roles: ADMIN },
      { label: 'Struktur organisasi', roles: ADMIN },
      { label: 'Shift & jadwal kerja', roles: ADMIN },
      { label: 'Absensi & kehadiran', roles: ADMIN },
      { label: 'Izin & cuti', roles: ADMIN },
      { label: 'Lembur', roles: ADMIN },
      { label: 'Payroll', roles: ADMIN },
      { label: 'Penilaian kinerja', roles: ADMIN },
      { label: 'Rekrutmen', roles: ADMIN },
    ],
  },
  {
    id: 'sales',
    label: 'Penjualan',
    icon: 'sales',
    items: [
      { href: '/dashboard/bookings', label: 'Booking', roles: OPS },
      { href: '/dashboard/schedule', label: 'Jadwal slot', roles: OPS },
      { href: '/dashboard/price-rules', label: 'Aturan harga', roles: ADMIN },
      { href: '/dashboard/vouchers', label: 'Voucher & promo', roles: ADMIN },
      // Paket membership, event, dan kelas coaching punya modulnya sendiri —
      // tidak diulang di sini supaya satu fitur tidak muncul di dua tempat.
      { label: 'POS kasir', roles: ADMIN },
      { label: 'Penjualan produk & F&B', roles: ADMIN },
      { label: 'Target penjualan', roles: ADMIN },
      { label: 'Komisi sales', roles: ADMIN },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: 'maintenance',
    items: [
      { href: '/dashboard/maintenance', label: 'Blokir lapangan', roles: OPS },
      { label: 'Jadwal perawatan', roles: ADMIN },
      { label: 'Aset & peralatan', roles: ADMIN },
      { label: 'Laporan kerusakan', roles: ADMIN },
      { label: 'Work order', roles: ADMIN },
      { label: 'Riwayat perbaikan', roles: ADMIN },
      { label: 'Vendor servis', roles: ADMIN },
    ],
  },
  {
    id: 'tenant',
    label: 'Tenant',
    icon: 'tenant',
    items: [
      { href: '/dashboard/contracts', label: 'Kontrak & tagihan', roles: TENANT },
      { label: 'Daftar tenant', roles: ADMIN },
      { label: 'Unit & ruang sewa', roles: ADMIN },
      { label: 'Kontrak sewa', roles: ADMIN },
      { label: 'Tagihan bulanan', roles: ADMIN },
      { label: 'Pembayaran tenant', roles: ADMIN },
      { label: 'Deposit & jaminan', roles: ADMIN },
      { label: 'Utilitas', roles: ADMIN },
      { label: 'Perpanjangan & terminasi', roles: ADMIN },
    ],
  },
  {
    id: 'report',
    label: 'Laporan',
    icon: 'report',
    items: [
      { label: 'Ringkasan harian', roles: ADMIN },
      { label: 'Laporan pendapatan', roles: ADMIN },
      { label: 'Okupansi lapangan', roles: ADMIN },
      { label: 'Rekap diskon', roles: ADMIN },
      { label: 'Aging piutang tenant', roles: ADMIN },
      { label: 'Laba/rugi', roles: ADMIN },
      { label: 'Posisi kas', roles: ADMIN },
      { label: 'Laporan membership', roles: ADMIN },
      { label: 'Laporan SDM', roles: ADMIN },
      { label: 'Pusat ekspor', roles: ADMIN },
    ],
  },
  {
    id: 'user-management',
    label: 'Manajemen user',
    icon: 'userManagement',
    items: [
      { href: '/dashboard/users', label: 'User internal', roles: ADMIN },
      { href: '/dashboard/audit-logs', label: 'Audit log', roles: ADMIN },
      { label: 'Role & permission', roles: ADMIN },
      { label: 'User customer', roles: ADMIN },
      { label: 'Sesi aktif', roles: ADMIN },
      { label: 'Kebijakan password', roles: ADMIN },
    ],
  },
  {
    id: 'master-data',
    label: 'Master data',
    icon: 'masterData',
    items: [
      { href: '/dashboard/courts', label: 'Lapangan', roles: ADMIN },
      { label: 'Venue & cabang', roles: ADMIN },
      { label: 'Jenis olahraga', roles: ADMIN },
      { label: 'Fasilitas', roles: ADMIN },
      { label: 'Jam operasional', roles: ADMIN },
      { label: 'Kategori produk', roles: ADMIN },
      { label: 'Satuan', roles: ADMIN },
      { label: 'Metode pembayaran', roles: ADMIN },
      { label: 'Bank & rekening', roles: ADMIN },
      { label: 'Hari libur', roles: ADMIN },
    ],
  },
  {
    id: 'system-settings',
    label: 'Pengaturan sistem',
    icon: 'settings',
    items: [
      { href: '/dashboard/settings', label: 'Pengaturan', roles: ADMIN },
      { label: 'Profil perusahaan', roles: ADMIN },
      { label: 'Payment gateway', roles: ADMIN },
      { label: 'Notifikasi & template', roles: ADMIN },
      { label: 'Integrasi & API', roles: ADMIN },
      { label: 'Aturan poin', roles: ADMIN },
      { label: 'Backup & restore', roles: ADMIN },
      { label: 'Log sistem', roles: ADMIN },
    ],
  },
]

/** Grup tanpa satu pun item yang boleh dilihat peran ini ikut hilang. */
export function navigationForRole(role: AdminRole): NavigationGroup[] {
  return navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0)
}

/** Layar yang benar-benar bisa dibuka peran ini — dipakai test dan route guard. */
export function routableNavigationForRole(role: AdminRole): NavigationItem[] {
  return navigationForRole(role)
    .flatMap((group) => group.items)
    .filter((item) => item.href !== undefined)
}

/**
 * Grup yang memuat rute aktif, supaya sidebar membuka sendiri modul yang sedang
 * dibuka. `/dashboard` cocok persis saja — kalau tidak, ia akan mengklaim setiap
 * rute anak dan setiap grup ikut terbuka.
 */
export function activeGroupId(role: AdminRole, pathname: string): string | null {
  for (const group of navigationForRole(role)) {
    for (const item of group.items) {
      if (item.href === undefined) continue
      if (item.href === pathname) return group.id
      if (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)) return group.id
    }
  }
  return null
}
