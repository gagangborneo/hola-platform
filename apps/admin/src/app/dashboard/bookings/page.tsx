import type { ReactNode } from 'react'
import { RolePlaceholder } from '../../../components/shell/RolePlaceholder.tsx'

export default function BookingsPage(): ReactNode {
  return (
    <RolePlaceholder
      allowedRoles={['admin', 'staff']}
      title="Jadwal & booking"
      description="Ruang kerja untuk jadwal, check-in, dan booking manual akan terhubung saat modul booking selesai."
    />
  )
}
