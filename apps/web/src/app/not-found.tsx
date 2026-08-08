import type { ReactNode } from 'react'
import { EmptyState } from '../components/common/EmptyState.tsx'

export default function NotFound(): ReactNode {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24">
      <EmptyState
        title="Halaman tidak ditemukan"
        description="Tautan yang kamu buka mungkin sudah berubah atau salah ketik."
        actionHref="/"
        actionLabel="Kembali ke beranda"
      />
    </main>
  )
}
