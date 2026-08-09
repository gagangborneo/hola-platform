import {
  BellRing,
  CalendarCheck,
  CircleHelp,
  Medal,
  ShieldCheck,
  Swords,
  TicketPercent,
  Trophy,
  UserRound,
  Wallet,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export interface AccountNavItem {
  label: string
  description: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Kosong berarti halamannya belum ada — item dirender nonaktif dengan lencana "Segera". */
  href?: string
}

export interface AccountNavGroup {
  title: string
  items: readonly AccountNavItem[]
}

/**
 * Peta menu akun pelanggan. Item tanpa `href` sengaja belum bisa diklik: ia
 * memperlihatkan arah produk (modul yang sudah direncanakan di `tasks/ROADMAP.md`
 * — pembayaran & refund, promo, event, pertandingan, poin, profil, notifikasi)
 * tanpa menjanjikan halaman yang belum dibangun.
 */
export const ACCOUNT_NAV: readonly AccountNavGroup[] = [
  {
    title: 'Pesanan',
    items: [
      {
        label: 'Booking Saya',
        description: 'Jadwal mendatang & riwayat main',
        icon: CalendarCheck,
        href: '/akun/booking',
      },
      {
        label: 'Pembayaran & Refund',
        description: 'Tagihan, bukti bayar, pengembalian dana',
        icon: Wallet,
      },
      {
        label: 'Voucher & Promo',
        description: 'Kode promo dan voucher milikmu',
        icon: TicketPercent,
      },
    ],
  },
  {
    title: 'Aktivitas',
    items: [
      {
        label: 'Event & Turnamen',
        description: 'Pendaftaran event yang kamu ikuti',
        icon: Trophy,
      },
      {
        label: 'Main Bareng',
        description: 'Ajakan main dan lawan tanding',
        icon: Swords,
      },
      {
        label: 'Poin & Membership',
        description: 'Kumpulkan poin tiap kali main',
        icon: Medal,
      },
    ],
  },
  {
    title: 'Akun',
    items: [
      {
        label: 'Profil Saya',
        description: 'Nama, kontak, dan preferensi olahraga',
        icon: UserRound,
        href: '/akun/profil',
      },
      {
        label: 'Notifikasi',
        description: 'Pengingat jadwal dan status pembayaran',
        icon: BellRing,
        href: '/akun/notifikasi',
      },
      {
        label: 'Keamanan & Perangkat',
        description: 'Password dan perangkat yang aktif',
        icon: ShieldCheck,
        href: '/akun/keamanan',
      },
      {
        label: 'Bantuan & Kontak',
        description: 'Jam operasional dan cara menghubungi kami',
        icon: CircleHelp,
        href: '/jam-operasional',
      },
    ],
  },
]

/** Menu dianggap aktif untuk halaman anaknya juga (mis. detail booking, e-receipt). */
export function isAccountNavItemActive(href: string | undefined, pathname: string): boolean {
  if (!href) return false
  return pathname === href || pathname.startsWith(`${href}/`)
}
