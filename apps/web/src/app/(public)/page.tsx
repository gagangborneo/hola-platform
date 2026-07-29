import Link from 'next/link'
import type { ReactNode } from 'react'
import { SessionStatus } from '../../components/auth/SessionStatus.tsx'

export default function HomePage(): ReactNode {
  return (
    <main className="landing-shell">
      <nav className="top-nav" aria-label="Navigasi utama">
        <Link className="brand" href="/">
          Hola Platform
        </Link>
        <div className="nav-links">
          <Link href="/login">Masuk</Link>
          <Link className="button-link" href="/daftar">
            Daftar
          </Link>
        </div>
      </nav>
      <section className="hero">
        <p className="eyebrow">Olahraga lebih tertata</p>
        <h1>Shell pelanggan Hola siap dipakai.</h1>
        <p>
          Fondasi web untuk autentikasi, booking, dan pengalaman pelanggan dibangun bertahap dari
          satu kontrak API.
        </p>
        <div className="hero-actions">
          <Link className="button-link" href="/daftar">
            Buat akun
          </Link>
          <Link className="text-link" href="/login">
            Saya sudah punya akun
          </Link>
        </div>
        <SessionStatus />
      </section>
    </main>
  )
}
