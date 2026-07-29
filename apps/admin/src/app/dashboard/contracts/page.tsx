import type { ReactNode } from 'react'
import { RolePlaceholder } from '../../../components/shell/RolePlaceholder.tsx'

export default function ContractsPage(): ReactNode {
  return (
    <RolePlaceholder
      allowedRoles={['tenant']}
      title="Kontrak & tagihan"
      description="Kontrak, invoice, dan unggahan bukti bayar tenant akan tersedia saat modul tenant selesai."
    />
  )
}
