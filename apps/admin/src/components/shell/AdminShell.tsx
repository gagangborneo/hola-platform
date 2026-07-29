'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { authStore, useAuthSession } from '../../lib/auth.ts'
import { env } from '../../lib/env.ts'
import { navigationForRole } from './navigation.ts'

interface AdminShellProps {
  children: ReactNode
}

function roleLabel(role: string): string {
  if (role === 'admin') return 'Administrator'
  if (role === 'staff') return 'Staff operasional'
  return 'Tenant'
}

export function AdminShell({ children }: AdminShellProps): ReactNode {
  const pathname = usePathname()
  const router = useRouter()
  const session = useAuthSession()
  const user = session.user

  const logout = async (): Promise<void> => {
    try {
      const accessToken = authStore.getAccessToken()
      if (accessToken) {
        await globalThis.fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      }
    } catch {
      // Pembersihan sesi lokal tetap harus berjalan jika API sedang tidak dapat dijangkau.
    } finally {
      authStore.clearAccessToken()
      router.replace('/login')
    }
  }

  if (!user) return null

  return (
    <div className="admin-shell">
      <aside className="side-nav">
        <Link className="brand" href="/dashboard">
          Hola Back Office
        </Link>
        <p className="side-role">{roleLabel(user.role)}</p>
        <nav aria-label="Navigasi back-office">
          {navigationForRole(user.role).map((item) => (
            <Link
              className={pathname === item.href ? 'nav-link nav-link-active' : 'nav-link'}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="main-shell">
        <header className="admin-header">
          <div>
            <strong>{user.fullName}</strong>
            <span>{user.email ?? 'Akun operasional'}</span>
          </div>
          <button className="button-secondary" type="button" onClick={() => void logout()}>
            Keluar
          </button>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
