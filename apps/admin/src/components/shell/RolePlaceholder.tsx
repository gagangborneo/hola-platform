import type { ReactNode } from 'react'
import type { AdminRole } from '../../lib/auth.ts'
import { RoleRouteGuard } from './RoleRouteGuard.tsx'

interface RolePlaceholderProps {
  allowedRoles: readonly AdminRole[]
  description: string
  title: string
}

/** Placeholder terjaga RBAC untuk modul yang datang pada fase domain berikutnya. */
export function RolePlaceholder({
  allowedRoles,
  description,
  title,
}: RolePlaceholderProps): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={allowedRoles}>
      <section className="page-stack">
        <div className="page-heading">
          <p className="eyebrow">Modul berikutnya</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
    </RoleRouteGuard>
  )
}
