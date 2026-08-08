import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { EmptyState } from '../../components/common/EmptyState.tsx'

export const metadata: Metadata = { title: 'Tidak ada koneksi' }

export default function OfflinePage(): ReactNode {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24">
      <EmptyState
        title="Tidak ada koneksi"
        description="Perangkat kamu sedang tidak terhubung ke internet. Booking yang sudah dibuat tetap aman."
        actionHref="/"
        actionLabel="Coba lagi"
      />
    </main>
  )
}
