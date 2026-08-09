'use client'

import { Button, NativeSelect } from '@hola/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { formErrorMessage } from '../../../components/common/form-error.ts'
import { QueryState } from '../../../components/common/QueryState.tsx'
import { StatusChip } from '../../../components/common/StatusChip.tsx'
import { VoucherForm } from '../../../components/promos/VoucherForm.tsx'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import { apiClient } from '../../../lib/api-client.ts'
import { parseOffsetList } from '../../../lib/api-response.ts'
import { formatDateTimeWita, formatRupiah } from '../../../lib/format.ts'
import * as labels from '../../../lib/labels.ts'
import {
  isPromoResponse,
  isPromoStatus,
  normalizePromo,
  PROMOS_QUERY_KEY,
  type Promo,
  quotaRatio,
} from '../../../lib/promos.ts'

function usePromos(status: string) {
  return useQuery({
    queryKey: [...PROMOS_QUERY_KEY, status],
    queryFn: async () => {
      const response = await apiClient.api.v1.promos.$get({
        query: { per_page: '50', ...(isPromoStatus(status) ? { status } : {}) },
      })
      const list = parseOffsetList(await response.json(), isPromoResponse)
      return { ...list, data: list.data.map(normalizePromo) }
    },
  })
}

function valueLabel(promo: Promo): string {
  if (promo.type === 'percent' && promo.valuePercent !== null) {
    const cap =
      promo.maxDiscountAmount === null ? '' : ` · maks ${formatRupiah(promo.maxDiscountAmount)}`
    return `${promo.valuePercent}%${cap}`
  }
  if (promo.type === 'fixed' && promo.valueAmount !== null) return formatRupiah(promo.valueAmount)
  if (promo.type === 'free_slot' && promo.freeSlotCount !== null) {
    return `${promo.freeSlotCount} slot gratis`
  }
  return '—'
}

function QuotaCell({ promo }: { promo: Promo }): ReactNode {
  const ratio = quotaRatio(promo)
  if (promo.quotaTotal === null) return <>{promo.quotaUsed} terpakai · tak terbatas</>
  return (
    <>
      {promo.quotaUsed} / {promo.quotaTotal}
      <br />
      <small>{ratio === null ? '' : `${Math.round(ratio * 100)}% terpakai`}</small>
    </>
  )
}

function VouchersPage(): ReactNode {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<Promo | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const promos = usePromos(statusFilter)

  const changeStatus = useMutation({
    mutationFn: async (input: {
      action: 'activate' | 'pause' | 'archive'
      id: string
    }): Promise<void> => {
      const target = apiClient.api.v1.promos[':id']
      if (input.action === 'activate') {
        await target.activate.$post({ param: { id: input.id } })
        return
      }
      if (input.action === 'pause') {
        await target.pause.$post({ param: { id: input.id } })
        return
      }
      await target.archive.$post({ param: { id: input.id } })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROMOS_QUERY_KEY })
    },
  })

  const run = async (action: 'activate' | 'pause' | 'archive', promo: Promo): Promise<void> => {
    if (
      action === 'archive' &&
      !globalThis.confirm(
        `Arsipkan voucher ${promo.code ?? promo.name}? Voucher tidak dapat dipakai lagi.`,
      )
    )
      return
    setError(null)
    try {
      await changeStatus.mutateAsync({ action, id: promo.id })
    } catch (actionError) {
      setError(formErrorMessage(actionError))
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading-row">
        <div className="page-heading">
          <p className="eyebrow">Konfigurasi</p>
          <h1>Voucher</h1>
          <p>
            Voucher hanya berlaku setelah statusnya aktif dan masa berlakunya berjalan. Kuota
            terpakai dihitung dari penukaran yang benar-benar terjadi.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsCreating((current) => !current)
            setEditing(null)
          }}
        >
          {isCreating ? 'Tutup formulir' : 'Tambah voucher'}
        </Button>
      </div>

      {isCreating ? (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Voucher baru</h2>
            </div>
          </div>
          <VoucherForm onDone={() => setIsCreating(false)} />
        </div>
      ) : null}

      {editing ? (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Ubah voucher</h2>
              <p>{editing.code ?? editing.name}</p>
            </div>
          </div>
          <VoucherForm onDone={() => setEditing(null)} promo={editing} />
        </div>
      ) : null}

      <div className="data-table-shell">
        <div className="table-controls">
          <label className="table-filter" htmlFor="voucher-status">
            <span>Status</span>
            <NativeSelect
              id="voucher-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Semua</option>
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="paused">Dijeda</option>
              <option value="expired">Kedaluwarsa</option>
              <option value="archived">Diarsipkan</option>
            </NativeSelect>
          </label>
        </div>

        <QueryState
          error={promos.error}
          isEmpty={(promos.data?.data.length ?? 0) === 0}
          emptyMessage="Belum ada voucher."
          isLoading={promos.isLoading}
          onRetry={() => void promos.refetch()}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Voucher</th>
                  <th scope="col">Jenis</th>
                  <th scope="col">Nilai</th>
                  <th scope="col">Minimal transaksi</th>
                  <th scope="col">Kuota</th>
                  <th scope="col">Masa berlaku</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(promos.data?.data ?? []).map((promo) => (
                  <tr key={promo.id}>
                    <td>
                      <strong>{promo.code ?? 'Otomatis'}</strong>
                      <br />
                      {promo.name}
                    </td>
                    <td>
                      <StatusChip {...labels.promoType(promo.type)} />
                    </td>
                    <td>{valueLabel(promo)}</td>
                    <td className="numeric">{formatRupiah(promo.minTransactionAmount)}</td>
                    <td>
                      <QuotaCell promo={promo} />
                    </td>
                    <td>
                      {formatDateTimeWita(promo.validFrom)}
                      <br />
                      <small>s.d. {formatDateTimeWita(promo.validUntil)}</small>
                    </td>
                    <td>
                      <StatusChip {...labels.promoStatus(promo.status)} />
                    </td>
                    <td>
                      <div className="row">
                        <Button
                          onClick={() => {
                            setIsCreating(false)
                            setEditing(promo)
                          }}
                          disabled={promo.type === 'free_slot'}
                          title={
                            promo.type === 'free_slot'
                              ? 'Voucher slot gratis dikelola di luar formulir Phase 1.'
                              : undefined
                          }
                          variant="secondary"
                          size="sm"
                        >
                          Ubah
                        </Button>
                        {promo.status === 'active' ? (
                          <Button
                            onClick={() => void run('pause', promo)}
                            disabled={changeStatus.isPending}
                            variant="secondary"
                            size="sm"
                          >
                            Jeda
                          </Button>
                        ) : (
                          <Button
                            onClick={() => void run('activate', promo)}
                            disabled={changeStatus.isPending || promo.status === 'archived'}
                            variant="secondary"
                            size="sm"
                          >
                            Aktifkan
                          </Button>
                        )}
                        <Button
                          onClick={() => void run('archive', promo)}
                          disabled={changeStatus.isPending || promo.status === 'archived'}
                          variant="destructive"
                          size="sm"
                        >
                          Arsipkan
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <VouchersPage />
    </RoleRouteGuard>
  )
}
