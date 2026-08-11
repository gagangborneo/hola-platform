import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SiteFooter } from '../components/layout/SiteFooter.tsx'
import { SiteHeader } from '../components/layout/SiteHeader.tsx'
import { env } from '../lib/env.ts'
import { fontVariables } from '../lib/fonts.ts'
import { Providers } from './providers.tsx'
import '../styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_WEB_BASE_URL),
  title: {
    default: 'Hola Sports Center — pesan lapangan online',
    template: '%s | Hola Sports Center',
  },
  description:
    'Pesan lapangan olahraga di Balikpapan secara online: lihat slot kosong, bayar, dan langsung main.',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'Hola Sports Center',
  },
}

interface RootLayoutProps {
  children: ReactNode
}

/**
 * Header dan footer tinggal di root, bukan di tiap segmen: checkout, hold
 * booking, dan status pembayaran sebelumnya tidak punya layout sama sekali
 * sehingga kehilangan navigasi persis di tengah alur pemesanan. Menaruhnya di
 * sini membuat halaman baru ikut mewarisi kerangka yang sama tanpa perlu
 * diingat satu per satu.
 *
 * `print:hidden` dipertahankan dari layout `/akun`: `/akun/booking/{id}/receipt`
 * dicetak sebagai bukti pemesanan, dan hanya isinya yang boleh ikut tercetak.
 */
export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="id" className={fontVariables}>
      {/* Kolom flex setinggi viewport menahan footer tetap di bawah pada halaman
          pendek (mis. /offline dan status pembayaran) tanpa `position: fixed`. */}
      <body className="flex min-h-screen flex-col">
        <Providers>
          <div className="print:hidden">
            <SiteHeader />
          </div>
          <div className="flex flex-1 flex-col">{children}</div>
          <div className="print:hidden">
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  )
}
