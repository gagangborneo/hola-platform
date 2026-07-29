'use client'

import * as Sentry from '@sentry/nextjs'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/** Menangkap error UI tak tertangani; validasi form tetap ditangani lokal. */
export default function GlobalError({ error, reset }: GlobalErrorProps): ReactNode {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="id">
      <body>
        <main className="auth-shell">
          <section className="auth-card">
            <p className="eyebrow">Hola Platform</p>
            <h1>Terjadi gangguan</h1>
            <p className="muted">Coba ulangi halaman ini beberapa saat lagi.</p>
            <button type="button" onClick={reset}>
              Coba lagi
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
