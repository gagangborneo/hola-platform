'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import type { AdminRole } from '../../lib/auth.ts'
import { useAuthSession } from '../../lib/auth.ts'

interface RoleRouteGuardProps {
  allowedRoles?: readonly AdminRole[]
  children: ReactNode
}

/** Guard UX; API tetap memverifikasi JWT dan RBAC pada setiap request. */
export function RoleRouteGuard({ allowedRoles, children }: RoleRouteGuardProps): ReactNode {
  const router = useRouter()
  const session = useAuthSession()
  const allowed =
    session.user !== null &&
    (allowedRoles === undefined || allowedRoles.includes(session.user.role))

  useEffect(() => {
    if (!session.isReady) return
    if (!session.user) {
      router.replace('/login')
      return
    }
    if (!allowed) router.replace('/dashboard')
  }, [allowed, router, session.isReady, session.user])

  if (!session.isReady) return <main className="loading-screen">Memulihkan sesi aman…</main>
  if (!allowed) return <main className="loading-screen">Memeriksa akses…</main>
  return children
}
