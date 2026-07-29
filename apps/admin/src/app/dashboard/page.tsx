'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAuthSession } from '../../lib/auth.ts'

interface RoleCopy {
  description: string
  links: ReadonlyArray<{ href: string; label: string }>
  title: string
}

function copyForRole(role: string): RoleCopy {
  if (role === 'admin') {
    return {
      title: 'Pusat kendali operasional',
      description: 'Kelola pengguna, konfigurasi aplikasi, dan jejak perubahan dari satu tempat.',
      links: [
        { href: '/dashboard/users', label: 'Kelola pengguna' },
        { href: '/dashboard/settings', label: 'Buka pengaturan' },
        { href: '/dashboard/audit-logs', label: 'Lihat audit log' },
      ],
    }
  }
  if (role === 'staff') {
    return {
      title: 'Operasional harian',
      description: 'Jadwal dan booking manual akan tersedia dari ruang kerja staff ini.',
      links: [{ href: '/dashboard/bookings', label: 'Buka jadwal & booking' }],
    }
  }
  return {
    title: 'Portal tenant',
    description: 'Kontrak, tagihan, dan bukti pembayaran tenant dikelola dari portal ini.',
    links: [{ href: '/dashboard/contracts', label: 'Buka kontrak & tagihan' }],
  }
}

export default function DashboardPage(): ReactNode {
  const session = useAuthSession()
  if (!session.user) return null
  const copy = copyForRole(session.user.role)

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">{session.user.role}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      <div className="dashboard-cards">
        {copy.links.map((link) => (
          <Link className="dashboard-card" href={link.href} key={link.href}>
            {link.label}
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
