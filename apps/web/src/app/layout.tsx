import type { Metadata } from 'next'
import type { ReactNode } from 'react'
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

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="id" className={fontVariables}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
