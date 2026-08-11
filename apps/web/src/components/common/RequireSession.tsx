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
      // Query string WAJIB ikut: `usePathname()` membuangnya, padahal justru di
      // sana konteks pemesanan hidup (`/checkout?court=…&slots=…`). Tanpa ini
      // customer yang memilih slot lalu diminta masuk akan mendarat di
      // `/checkout` telanjang setelah login — dan halaman itu menjawab
      // `notFound()` tanpa `court`/`slots`, jadi pilihannya hilang dan ia
      // disambut 404 tepat setelah berhasil login.
      //
      // Dibaca dari `location` di dalam efek, bukan `useSearchParams()`:
      // hook itu memaksa halaman statis di bawah `/akun` bailout ke render
      // klien (atau menuntut Suspense). Efek ini hanya jalan di browser,
      // jadi `location` selalu tersedia di sini.
      const search = globalThis.location.search
      router.replace(`/login?next=${encodeURIComponent(`${pathname}${search}`)}`)
    }
  }, [session.isReady, session.accessToken, pathname, router])

  if (!session.isReady) {
    return <p className="mx-auto max-w-2xl px-4 py-16 text-muted-foreground">Memuat sesi…</p>
  }
  if (session.accessToken === null) return null
  return <>{children}</>
}
