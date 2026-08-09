import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { NotificationInbox } from '../../../components/account/NotificationInbox.tsx'
import { NotificationPreferences } from '../../../components/account/NotificationPreferences.tsx'

export const metadata: Metadata = { title: 'Notifikasi' }

export default function NotificationsPage(): ReactNode {
  return (
    <div className="grid gap-5">
      <header className="rounded-xl border bg-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Akun saya</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-foreground sm:text-3xl">
          Notifikasi
        </h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
          Pengingat jadwal main, status pembayaran, dan kabar keamanan akun — semuanya tersimpan di
          sini.
        </p>
      </header>

      <NotificationInbox />
      <NotificationPreferences />
    </div>
  )
}
