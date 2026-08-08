'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { ErrorFallback } from '../components/common/ErrorFallback.tsx'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/** Batas error untuk kegagalan di dalam halaman. `global-error.tsx` menangani layout root. */
export default function ErrorPage({ error, reset }: ErrorPageProps): ReactNode {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorFallback
      title="Ada yang tidak beres"
      description="Kami sudah mencatat kejadiannya. Coba muat ulang halaman ini."
      error={error}
      reset={reset}
    />
  )
}
