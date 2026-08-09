'use client'

import { Button, NativeSelect } from '@hola/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { formErrorMessage } from '../../../components/common/form-error.ts'
import { QueryState } from '../../../components/common/QueryState.tsx'
import { StatusChip } from '../../../components/common/StatusChip.tsx'
import { PriceCoverageAudit } from '../../../components/pricing/PriceCoverageAudit.tsx'
import { PriceRuleForm } from '../../../components/pricing/PriceRuleForm.tsx'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import { apiClient } from '../../../lib/api-client.ts'
import { parseOffsetList } from '../../../lib/api-response.ts'
import { fetchCourtDetail, useCourts, useSports } from '../../../lib/courts.ts'
import { formatClock, formatRupiah } from '../../../lib/format.ts'
import * as labels from '../../../lib/labels.ts'
import {
  isPriceRuleResponse,
  normalizePriceRule,
  PRICE_RULES_QUERY_KEY,
  type PriceRule,
} from '../../../lib/price-rules.ts'

function usePriceRules(courtId: string) {
  return useQuery({
    queryKey: [...PRICE_RULES_QUERY_KEY, courtId],
    queryFn: async () => {
      const response = await apiClient.api.v1['price-rules'].$get({
        query: { per_page: '100', ...(courtId ? { court_id: courtId } : {}) },
      })
      const list = parseOffsetList(await response.json(), isPriceRuleResponse)
      return { ...list, data: list.data.map(normalizePriceRule) }
    },
  })
}

function PriceRulesPage(): ReactNode {
  const queryClient = useQueryClient()
  const courts = useCourts()
  const sports = useSports()
  const [courtFilter, setCourtFilter] = useState('')
  const [editing, setEditing] = useState<PriceRule | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const rules = usePriceRules(courtFilter)

  const remove = useMutation({
    mutationFn: async (ruleId: string): Promise<void> => {
      await apiClient.api.v1['price-rules'][':id'].$delete({ param: { id: ruleId } })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRICE_RULES_QUERY_KEY })
    },
  })

  const courtName = (courtId: string | null): string => {
    if (!courtId) return 'Semua lapangan'
    return courts.data?.find((court) => court.id === courtId)?.name ?? courtId
  }
  const sportName = (sportId: string | null): string => {
    if (!sportId) return '—'
    return sports.data?.find((sport) => sport.id === sportId)?.name ?? sportId
  }

  const onDelete = async (rule: PriceRule): Promise<void> => {
    if (
      !globalThis.confirm(
        `Hapus aturan ${formatClock(rule.startsTime)}–${formatClock(rule.endsTime)} untuk ${courtName(rule.courtId)}?`,
      )
    )
      return
    setActionError(null)
    try {
      await remove.mutateAsync(rule.id)
    } catch (error) {
      setActionError(formErrorMessage(error))
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading-row">
        <div className="page-heading">
          <p className="eyebrow">Konfigurasi</p>
          <h1>Aturan harga</h1>
          <p>
            Aturan inilah satu-satunya sumber harga slot. Slot yang tidak tercakup aturan mana pun
            akan menolak booking customer — periksa cakupannya setiap kali daftar harga berubah.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsCreating((current) => !current)
            setEditing(null)
          }}
        >
          {isCreating ? 'Tutup formulir' : 'Tambah aturan'}
        </Button>
      </div>

      {isCreating ? (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Aturan harga baru</h2>
            </div>
          </div>
          <PriceRuleForm
            courts={courts.data ?? []}
            onDone={() => setIsCreating(false)}
            sports={sports.data ?? []}
          />
        </div>
      ) : null}

      {editing ? (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Ubah aturan harga</h2>
              <p>{courtName(editing.courtId)}</p>
            </div>
          </div>
          <PriceRuleForm
            courts={courts.data ?? []}
            onDone={() => setEditing(null)}
            rule={editing}
            sports={sports.data ?? []}
          />
        </div>
      ) : null}

      <div className="data-table-shell">
        <div className="table-controls">
          <label className="table-filter" htmlFor="rules-court">
            <span>Lapangan</span>
            <NativeSelect
              id="rules-court"
              value={courtFilter}
              onChange={(event) => setCourtFilter(event.target.value)}
            >
              <option value="">Semua</option>
              {(courts.data ?? []).map((court) => (
                <option value={court.id} key={court.id}>
                  {court.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>

        <QueryState
          error={rules.error}
          isEmpty={(rules.data?.data.length ?? 0) === 0}
          emptyMessage="Belum ada aturan harga. Tanpa aturan, tidak ada slot yang dapat dibeli."
          isLoading={rules.isLoading}
          onRetry={() => void rules.refetch()}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Sasaran</th>
                  <th scope="col">Jenis hari</th>
                  <th scope="col">Jam</th>
                  <th scope="col">Kelas</th>
                  <th scope="col">Harga / jam</th>
                  <th scope="col">Prioritas</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(rules.data?.data ?? []).map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      {courtName(rule.courtId)}
                      {rule.sportId ? (
                        <>
                          <br />
                          <small>{sportName(rule.sportId)}</small>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {labels.dayType(rule.dayType).label}
                      {rule.specificDate ? (
                        <>
                          <br />
                          <small>{rule.specificDate}</small>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {formatClock(rule.startsTime)}–{formatClock(rule.endsTime)}
                    </td>
                    <td>
                      <StatusChip {...labels.rateClass(rule.rateClass)} />
                    </td>
                    <td className="numeric">{formatRupiah(rule.pricePerHourAmount)}</td>
                    <td className="numeric">{rule.priority}</td>
                    <td>
                      <StatusChip
                        label={rule.isActive ? 'Aktif' : 'Nonaktif'}
                        tone={rule.isActive ? 'positive' : 'neutral'}
                      />
                    </td>
                    <td>
                      <div className="row">
                        <Button
                          onClick={() => {
                            setIsCreating(false)
                            setEditing(rule)
                          }}
                          variant="secondary"
                          size="sm"
                        >
                          Ubah
                        </Button>
                        <Button
                          onClick={() => void onDelete(rule)}
                          disabled={remove.isPending}
                          variant="destructive"
                          size="sm"
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
        {actionError ? <p className="form-error">{actionError}</p> : null}
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Pratinjau &amp; cakupan harga</h2>
            <p>Jalankan sebelum go-live dan setiap kali daftar harga client berubah.</p>
          </div>
        </div>
        <PriceCoverageAudit courts={courts.data ?? []} loadCourtDetail={fetchCourtDetail} />
      </div>
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <PriceRulesPage />
    </RoleRouteGuard>
  )
}
