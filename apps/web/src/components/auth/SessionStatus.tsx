'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAuthSession } from '../../lib/auth.ts'

/** Indikator kecil bahwa refresh cookie sedang/berhasil dipulihkan tanpa localStorage. */
export function SessionStatus(): ReactNode {
  const session = useAuthSession()
  if (!session.isReady) return <p className="session-status">Memulihkan sesi aman…</p>
  if (session.accessToken) return <p className="session-status">Sesi Anda aktif.</p>
  return (
    <p className="session-status">
      Belum masuk. <Link href="/login">Masuk untuk melanjutkan.</Link>
    </p>
  )
}
