import { Button } from '@hola/ui'
import type { ReactNode } from 'react'

interface ErrorFallbackProps {
  title: string
  description: string
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Bagian tampilan yang dipakai bersama oleh setiap `error.tsx` per segmen. Ini BUKAN
 * pengganti batas error React — setiap `error.tsx` tetap wajib berupa komponen client
 * tersendiri dengan prop `error`/`reset` sendiri karena Next.js memperlakukan tiap
 * `error.tsx` sebagai batas terpisah.
 */
export function ErrorFallback({ title, description, error, reset }: ErrorFallbackProps): ReactNode {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p>
      {error.digest ? (
        <p className="mt-2 text-sm text-muted-foreground">Kode kejadian: {error.digest}</p>
      ) : null}
      <Button className="mt-8" onClick={reset}>
        Coba lagi
      </Button>
    </main>
  )
}
