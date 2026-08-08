import type { ReactNode } from 'react'
import { AuthCard } from '../../../components/auth/AuthCard.tsx'
import { ForgotPasswordForm } from '../../../components/auth/ForgotPasswordForm.tsx'

export default function ForgotPasswordPage(): ReactNode {
  return (
    <AuthCard
      title="Lupa password"
      description="Masukkan email akun Anda. Kami tidak mengungkap apakah akun tersebut terdaftar."
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
