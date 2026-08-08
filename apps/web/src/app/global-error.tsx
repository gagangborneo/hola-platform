'use client'

import * as Sentry from '@sentry/nextjs'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Button } from '../components/ui/button.tsx'

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
        <main className="grid min-h-screen items-center justify-items-center bg-background p-6">
          <section className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-xl shadow-primary/5">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Hola Platform
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
              Terjadi gangguan
            </h1>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Coba ulangi halaman ini beberapa saat lagi.
            </p>
            <Button type="button" onClick={reset} className="mt-4">
              Coba lagi
            </Button>
          </section>
        </main>
      </body>
    </html>
  )
}
