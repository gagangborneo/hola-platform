'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useSyncExternalStore } from 'react'
import { authStore } from '../../lib/auth.ts'

interface RequireSessionProps {
  children: ReactNode
}

/**
 * Access token hanya hidup di memori (S-5), jadi middleware peladen tidak dapat
 * menilai sesi. Penjaga ini menunggu `restoreSession` selesai sebelum menyimpulkan
 * bahwa pengunjung belum masuk — tanpa itu, reload halaman akan memantulkan
 * pengguna yang sebenarnya sudah login.
 */
export function RequireSession({ children }: RequireSessionProps): ReactNode {
  const router = useRouter()
  const pathname = usePathname()
  const session = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot,
  )

  useEffect(() => {
    if (session.isReady && session.accessToken === null) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [session.isReady, session.accessToken, pathname, router])

  if (!session.isReady) {
    return <p className="mx-auto max-w-2xl px-4 py-16 text-muted-foreground">Memuat sesi…</p>
  }
  if (session.accessToken === null) return null
  return <>{children}</>
}
