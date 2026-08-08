'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { ErrorFallback } from '../../../components/common/ErrorFallback.tsx'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/** Batas error khusus segmen `/lapangan`; terpisah dari `app/error.tsx` di root. */
export default function LapanganErrorPage({ error, reset }: ErrorPageProps): ReactNode {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorFallback
      title="Daftar lapangan gagal dimuat"
      description="Ketersediaan lapangan sedang tidak dapat diambil. Coba lagi sebentar."
      error={error}
      reset={reset}
    />
  )
}
