import type { ReactNode } from 'react'
import { AdminShell } from '../../components/shell/AdminShell.tsx'
import { RoleRouteGuard } from '../../components/shell/RoleRouteGuard.tsx'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps): ReactNode {
  return (
    <RoleRouteGuard>
      <AdminShell>{children}</AdminShell>
    </RoleRouteGuard>
  )
}
