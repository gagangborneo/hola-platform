'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { authStore } from '../lib/auth.ts'
import { createQueryClient } from '../lib/query-client.ts'

interface ProvidersProps {
  children: ReactNode
}

/** Provider browser untuk TanStack Query, pemulihan sesi, dan deteksi offline. */
export function Providers({ children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(createQueryClient)
  const router = useRouter()
  // Path terakhir sebelum diarahkan ke /offline, dipakai untuk kembali otomatis saat online.
  const lastOnlinePath = useRef('/')

  useEffect(() => {
    // S-5: single-flight di store mencegah React Strict Mode memakai refresh cookie dua kali.
    void authStore.restoreSession()
  }, [])

  useEffect(() => {
    // Efek ini hanya berjalan di klien setelah mount, jadi listener ini tidak pernah
    // ditambahkan selama render di server (tidak ada `window`/`globalThis.addEventListener`
    // saat SSR).
    const goOffline = (): void => {
      if (globalThis.location.pathname !== '/offline') {
        lastOnlinePath.current = globalThis.location.pathname
      }
      router.push('/offline')
    }
    // Tanpa listener 'online', pelanggan yang koneksinya kembali akan terjebak di /offline
    // sampai mengklik tautan secara manual. Kembalikan otomatis ke halaman sebelumnya.
    const goOnline = (): void => {
      if (globalThis.location.pathname === '/offline') {
        router.push(lastOnlinePath.current)
      }
    }
    globalThis.addEventListener('offline', goOffline)
    globalThis.addEventListener('online', goOnline)
    return () => {
      globalThis.removeEventListener('offline', goOffline)
      globalThis.removeEventListener('online', goOnline)
    }
  }, [router])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
