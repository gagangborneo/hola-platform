import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Providers } from './providers.tsx'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Hola Back Office',
    template: '%s | Hola Back Office',
  },
  description: 'Back-office operasional Hola Platform.',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
