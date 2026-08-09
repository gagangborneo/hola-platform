'use client'

import { Button } from '@hola/ui'
import * as Sentry from '@sentry/nextjs'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/** Error UI tak tertangani masuk ke Sentry; error API biasa ditampilkan di komponen. */
export default function GlobalError({ error, reset }: GlobalErrorProps): ReactNode {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="id">
      <body>
        <main className="auth-shell">
          <section className="auth-card">
            <p className="eyebrow">Hola Back Office</p>
            <h1>Terjadi gangguan</h1>
            <p className="muted">Coba ulangi halaman ini beberapa saat lagi.</p>
            <Button onClick={reset}>Coba lagi</Button>
          </section>
        </main>
      </body>
    </html>
  )
}
