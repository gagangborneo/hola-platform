import type { ReactNode } from 'react'

interface AuthCardProps {
  children: ReactNode
  description: string
  title: string
}

export function AuthCard({ children, description, title }: AuthCardProps): ReactNode {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">Hola Platform</p>
        <h1 id="auth-title">{title}</h1>
        <p className="muted">{description}</p>
        {children}
      </section>
    </main>
  )
}
