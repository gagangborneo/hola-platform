import type { ReactNode } from 'react'

interface AuthCardProps {
  children: ReactNode
  description: string
  title: string
}

/**
 * `flex-1`, bukan `min-h-screen`: halaman auth kini berada di bawah header dan
 * di atas footer root layout, jadi memaksa setinggi viewport akan mendorong
 * footer keluar layar dan memunculkan gulir yang tidak perlu. Mengisi sisa
 * kolom flex membuat kartunya tetap terpusat secara vertikal.
 */
export function AuthCard({ children, description, title }: AuthCardProps): ReactNode {
  return (
    <main className="grid flex-1 items-center justify-items-center bg-background p-6">
      <section
        className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-xl shadow-primary/5"
        aria-labelledby="auth-title"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Hola</p>
        <h1 id="auth-title" className="mt-2 font-display text-3xl font-bold text-foreground">
          {title}
        </h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
        {children}
      </section>
    </main>
  )
}
