'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useAuthSession } from '../lib/auth.ts'

/** Akar app selalu menuju login atau dashboard setelah sesi aman dipulihkan. */
export default function HomePage(): ReactNode {
  const router = useRouter()
  const session = useAuthSession()

  useEffect(() => {
    if (!session.isReady) return
    router.replace(session.user ? '/dashboard' : '/login')
  }, [router, session.isReady, session.user])

  return <main className="loading-screen">Memulihkan sesi aman…</main>
}
