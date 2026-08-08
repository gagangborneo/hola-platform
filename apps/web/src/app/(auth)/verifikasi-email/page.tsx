import type { ReactNode } from 'react'
import { AuthCard } from '../../../components/auth/AuthCard.tsx'
import { VerifyEmailForm } from '../../../components/auth/VerifyEmailForm.tsx'

export default function VerifyEmailPage(): ReactNode {
  return (
    <AuthCard
      title="Verifikasi email"
      description="Satu langkah lagi untuk mengaktifkan email akun Anda."
    >
      <VerifyEmailForm />
    </AuthCard>
  )
}
