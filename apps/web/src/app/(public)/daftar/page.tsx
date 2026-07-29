import type { ReactNode } from 'react'
import { AuthCard } from '../../../components/auth/AuthCard.tsx'
import { RegisterForm } from '../../../components/auth/RegisterForm.tsx'

export default function RegisterPage(): ReactNode {
  return (
    <AuthCard
      title="Buat akun pelanggan"
      description="Daftar sebagai pelanggan untuk mulai memakai layanan Hola."
    >
      <RegisterForm />
    </AuthCard>
  )
}
