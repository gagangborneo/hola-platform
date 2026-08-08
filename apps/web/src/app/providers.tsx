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
  // Path+query terakhir sebelum diarahkan ke /offline, dipakai untuk kembali otomatis saat
  // online. Query string ikut disimpan (bukan cuma pathname) supaya konteks seperti
  // `?payment=<id>` (halaman status pembayaran) atau `?olahraga=<id>` (filter daftar
  // lapangan) tidak hilang saat dikembalikan (I5) — tanpanya `/booking/{id}/status` tanpa
  // `?payment=` memicu `notFound()`.
  const lastOnlinePath = useRef('/')
  // Sumber kebenaran "sedang di /offline?" dikontrol sendiri lewat ref ini, BUKAN dibaca
  // dari `globalThis.location.pathname`: `router.push('/offline')` di `goOffline` bersifat
  // async, jadi `location.pathname` belum tentu ter-commit ke `/offline` saat event 'online'
  // menyusul dengan cepat (flap offline→online). Membaca lokasi di titik itu bisa salah
  // menyimpulkan "belum di /offline" dan diam-diam melewatkan koreksi otomatis, menjebak
  // customer di halaman offline walau koneksinya sudah pulih.
  const isOffline = useRef(false)

  useEffect(() => {
    // S-5: single-flight di store mencegah React Strict Mode memakai refresh cookie dua kali.
    void authStore.restoreSession()
  }, [])

  useEffect(() => {
    // Efek ini hanya berjalan di klien setelah mount, jadi listener ini tidak pernah
    // ditambahkan selama render di server (tidak ada `window`/`globalThis.addEventListener`
    // saat SSR).
    const goOffline = (): void => {
      if (!isOffline.current) {
        lastOnlinePath.current = `${globalThis.location.pathname}${globalThis.location.search}`
      }
      isOffline.current = true
      router.push('/offline')
    }
    // Tanpa listener 'online', pelanggan yang koneksinya kembali akan terjebak di /offline
    // sampai mengklik tautan secara manual. Kembalikan otomatis ke halaman sebelumnya.
    const goOnline = (): void => {
      if (isOffline.current) {
        isOffline.current = false
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
