import type { ReactNode } from 'react'
import { LoginForm } from '../../components/auth/LoginForm.tsx'

export default function LoginPage(): ReactNode {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Hola Back Office</p>
        <h1>Masuk untuk bekerja</h1>
        <p className="muted">Gunakan akun admin, staff, atau tenant yang telah diaktifkan.</p>
        <LoginForm />
      </section>
    </main>
  )
}
