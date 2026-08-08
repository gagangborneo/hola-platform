import type { ReactNode } from 'react'
import { SiteFooter } from '../../components/layout/SiteFooter.tsx'
import { SiteHeader } from '../../components/layout/SiteHeader.tsx'

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps): ReactNode {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  )
}
