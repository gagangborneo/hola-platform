'use client'

import { useMutation } from '@tanstack/react-query'
import { BadgeCheck, MailWarning } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { displayErrorMessage } from '../../lib/error-message.ts'
import { formatDateWita } from '../../lib/format.ts'
import type { MyProfile } from '../../lib/my-profile.ts'
import { accountInitials } from '../../lib/session-identity.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'

const ROLE_LABEL: Record<string, string> = {
  customer: 'Pelanggan',
  staff: 'Staf',
  admin: 'Admin',
  tenant: 'Tenant kafe',
}

interface AccountIdentityCardProps {
  profile: MyProfile
}

/**
 * Ringkasan identitas + status verifikasi email.
 *
 * Email tidak dapat diubah dari halaman ini: ia sekaligus identifier login dan
 * alamat tujuan tautan verifikasi, jadi penggantiannya berjalan lewat alur
 * verifikasi sendiri — bukan satu simpanan form yang bisa mengunci pemiliknya
 * keluar dari akunnya.
 */
export function AccountIdentityCard({ profile }: AccountIdentityCardProps): ReactNode {
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestVerification = useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.v1.auth.email.verify.request.$post({ json: {} })
      return response.json()
    },
    onSuccess: () => {
      setError(null)
      setNotice('Tautan verifikasi dikirim. Cek kotak masuk email kamu.')
    },
    onError: (mutationError: Error) => {
      setNotice(null)
      setError(displayErrorMessage(mutationError, 'Pengiriman tautan gagal. Coba lagi.'))
    },
  })

  const identityUser = {
    id: profile.id,
    role: profile.role,
    email: profile.email,
    phone: profile.phone,
    fullName: profile.full_name,
  }
  const verifiedAt = profile.email_verified_at

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-2xl font-bold text-primary"
          aria-hidden
        >
          {accountInitials(identityUser)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-bold text-foreground">
            {profile.full_name}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Bergabung {formatDateWita(profile.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{ROLE_LABEL[profile.role] ?? profile.role}</Badge>
            {profile.profile ? (
              <Badge variant="outline">Kode referral {profile.profile.referral_code}</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Email
          </dt>
          <dd className="mt-1 wrap-break-word font-semibold text-foreground">
            {profile.email ?? 'Belum ada email'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Nomor HP
          </dt>
          <dd className="mt-1 font-semibold text-foreground">
            {profile.phone ?? 'Belum ada nomor HP'}
          </dd>
        </div>
      </dl>

      {profile.email ? (
        <div className="mt-4 rounded-lg bg-secondary/60 p-4">
          {verifiedAt ? (
            <p className="flex items-start gap-2 text-sm text-secondary-foreground">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Email sudah terverifikasi pada {formatDateWita(verifiedAt)}.
            </p>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="flex items-start gap-2 text-sm text-secondary-foreground">
                <MailWarning className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                Email belum diverifikasi. Verifikasi dulu agar tautan reset password dapat dikirim
                ke alamat ini.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={requestVerification.isPending}
                onClick={() => requestVerification.mutate()}
              >
                {requestVerification.isPending ? 'Mengirim…' : 'Kirim tautan verifikasi'}
              </Button>
            </div>
          )}
          {notice ? <p className="mt-3 text-sm font-semibold text-primary">{notice}</p> : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </section>
  )
}
