import type { ReactNode } from 'react'
import { AuthCard } from '../../../components/auth/AuthCard.tsx'
import { ResetPasswordForm } from '../../../components/auth/ResetPasswordForm.tsx'

export default function ResetPasswordPage(): ReactNode {
  return (
    <AuthCard
      title="Atur password baru"
      description="Pilih password baru yang aman untuk akun Anda."
    >
      <ResetPasswordForm />
    </AuthCard>
  )
}
