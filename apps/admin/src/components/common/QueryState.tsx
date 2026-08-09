import type { ReactNode } from 'react'
import { formErrorMessage } from './form-error.ts'

interface QueryStateProps {
  children: ReactNode
  emptyMessage?: string
  error: unknown
  isEmpty?: boolean
  isLoading: boolean
  loadingMessage?: string
  onRetry: () => void
}

/**
 * State memuat / gagal / kosong untuk panel non-tabel. `DataTable` menangani
 * ketiganya sendiri; komponen ini menyamakan perilakunya di luar tabel supaya
 * layar tidak drift satu sama lain.
 */
export function QueryState({
  children,
  emptyMessage,
  error,
  isEmpty = false,
  isLoading,
  loadingMessage = 'Memuat data…',
  onRetry,
}: QueryStateProps): ReactNode {
  if (error) {
    return (
      <div className="table-state table-error" role="alert">
        <p>{formErrorMessage(error)}</p>
        <button type="button" onClick={onRetry}>
          Coba lagi
        </button>
      </div>
    )
  }
  if (isLoading) return <p className="table-state">{loadingMessage}</p>
  if (isEmpty) return <p className="table-state">{emptyMessage ?? 'Belum ada data.'}</p>
  return children
}
