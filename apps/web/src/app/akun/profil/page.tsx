import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ProfileForm } from '../../../components/account/ProfileForm.tsx'

export const metadata: Metadata = { title: 'Profil saya' }

export default function ProfilePage(): ReactNode {
  return (
    <div className="grid gap-5">
      <header className="rounded-xl border bg-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Akun saya</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Profil Saya
        </h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
          Data ini dipakai untuk menghubungimu soal pesanan dan mencocokkan jadwal main dengan
          preferensimu.
        </p>
      </header>

      <ProfileForm />
    </div>
  )
}
