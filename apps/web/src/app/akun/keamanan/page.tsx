import { Button } from '@hola/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { PasswordChangeForm } from '../../../components/account/PasswordChangeForm.tsx'
import { SessionList } from '../../../components/account/SessionList.tsx'

export const metadata: Metadata = { title: 'Keamanan & perangkat' }

export default function SecurityPage(): ReactNode {
  return (
    <div className="grid gap-5">
      <header className="rounded-xl border bg-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Akun saya</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Keamanan & Perangkat
        </h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
          Atur password dan lihat perangkat mana saja yang masih dapat masuk ke akunmu.
        </p>
      </header>

      <PasswordChangeForm />
      <SessionList />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/60 p-5">
        <div>
          <p className="font-semibold text-foreground">Melihat aktivitas yang tidak kamu kenali?</p>
          <p className="text-sm text-muted-foreground">
            Ganti password lalu hubungi tim Hola pada jam operasional.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/jam-operasional">Hubungi kami</Link>
        </Button>
      </div>
    </div>
  )
}
