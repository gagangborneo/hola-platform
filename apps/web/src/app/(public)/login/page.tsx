import type { ReactNode } from 'react'
import { AuthCard } from '../../../components/auth/AuthCard.tsx'
import { LoginForm } from '../../../components/auth/LoginForm.tsx'

export default function LoginPage(): ReactNode {
  return (
    <AuthCard title="Masuk ke Hola" description="Gunakan email atau nomor HP yang terdaftar.">
      <LoginForm />
    </AuthCard>
  )
}
