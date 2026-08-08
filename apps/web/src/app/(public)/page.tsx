import Link from 'next/link'
import type { ReactNode } from 'react'
import { SessionStatus } from '../../components/auth/SessionStatus.tsx'
import { Button } from '../../components/ui/button.tsx'

export default function HomePage(): ReactNode {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <nav className="flex items-center justify-between" aria-label="Navigasi utama">
        <Link className="font-display text-xl font-bold" href="/">
          Hola Platform
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login">Masuk</Link>
          <Button asChild>
            <Link href="/daftar">Daftar</Link>
          </Button>
        </div>
      </nav>
      <section className="max-w-2xl py-24">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Olahraga lebih tertata
        </p>
        <h1>Shell pelanggan Hola siap dipakai.</h1>
        <p>
          Fondasi web untuk autentikasi, booking, dan pengalaman pelanggan dibangun bertahap dari
          satu kontrak API.
        </p>
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link href="/daftar">Buat akun</Link>
          </Button>
          <Link className="font-semibold text-primary hover:underline" href="/login">
            Saya sudah punya akun
          </Link>
        </div>
        <SessionStatus />
      </section>
    </main>
  )
}
