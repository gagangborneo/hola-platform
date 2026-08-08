import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { fontVariables } from '../lib/fonts.ts'
import { Providers } from './providers.tsx'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Hola Platform',
    template: '%s | Hola Platform',
  },
  description: 'Platform operasional olahraga Hola.',
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
