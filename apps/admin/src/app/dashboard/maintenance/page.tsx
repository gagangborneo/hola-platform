'use client'

import { HolaApiError } from '@hola/api-client'
import { buildSlotGrid, ERROR_CODE } from '@hola/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { formErrorMessage } from '../../../components/common/form-error.ts'
import { QueryState } from '../../../components/common/QueryState.tsx'
import { StatusChip } from '../../../components/common/StatusChip.tsx'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import { apiClient } from '../../../lib/api-client.ts'
import { isRecord, parseOffsetList } from '../../../lib/api-response.ts'
import { useAuthSession } from '../../../lib/auth.ts'
import { useCourtDetail, useCourts } from '../../../lib/courts.ts'
import { dayOfWeekFor, formatDateTimeWita, formatTimeWita, todayWita } from '../../../lib/format.ts'
import * as labels from '../../../lib/labels.ts'

interface Maintenance {
  cancelledAt: string | null
  courtId: string
  endsAt: string
  id: string
  reason: string
  startsAt: string
}

interface MaintenanceResponse {
  cancelled_at: string | null
  court_id: string
  ends_at: string
  id: string
  reason: string
  starts_at: string
}

function isMaintenanceResponse(value: unknown): value is MaintenanceResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.court_id === 'string' &&
    typeof value.starts_at === 'string' &&
    typeof value.ends_at === 'string' &&
    typeof value.reason === 'string' &&
    (typeof value.cancelled_at === 'string' || value.cancelled_at === null)
  )
}

function normalizeMaintenance(value: MaintenanceResponse): Maintenance {
  return {
    id: value.id,
    courtId: value.court_id,
    startsAt: value.starts_at,
    endsAt: value.ends_at,
    reason: value.reason,
    cancelledAt: value.cancelled_at,
  }
}

interface SlotConflict {
  claimType: string
  startsAt: string
}

/** Detail `409 SLOT_ALREADY_CLAIMED` — daftar klaim yang menghalangi blokir (E-11). */
function parseConflicts(error: unknown): SlotConflict[] | null {
  if (!(error instanceof HolaApiError) || error.code !== ERROR_CODE.SLOT_ALREADY_CLAIMED) {
    return null
  }
  if (!Array.isArray(error.details)) return []
  return error.details.flatMap((detail) =>
    isRecord(detail) && typeof detail.starts_at === 'string'
      ? [
          {
            startsAt: detail.starts_at,
            claimType: typeof detail.claim_type === 'string' ? detail.claim_type : 'booking',
          },
        ]
      : [],
  )
}

function useMaintenances(courtId: string) {
  return useQuery({
    queryKey: ['court-maintenances', courtId],
    queryFn: async () => {
      const response = await apiClient.api.v1['court-maintenances'].$get({
        query: { per_page: '50', ...(courtId ? { court_id: courtId } : {}) },
      })
      const list = parseOffsetList(await response.json(), isMaintenanceResponse)
      return { ...list, data: list.data.map(normalizeMaintenance) }
    },
  })
}

interface BlockDraft {
  courtId: string
  dateKey: string
  endsAt: string
  reason: string
  startsAt: string
}

function MaintenanceForm({ isAdmin }: { isAdmin: boolean }): ReactNode {
  const queryClient = useQueryClient()
  const courts = useCourts()
  const [draft, setDraft] = useState<BlockDraft>(() => ({
    courtId: '',
    dateKey: todayWita(new Date()),
    startsAt: '',
    endsAt: '',
    reason: '',
  }))
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<SlotConflict[] | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const detail = useCourtDetail(draft.courtId.length > 0 ? draft.courtId : null)

  const hours = detail.data?.operatingHours.find(
    (hour) => hour.dayOfWeek === dayOfWeekFor(draft.dateKey),
  )
  let slots: ReturnType<typeof buildSlotGrid> = []
  if (detail.data && hours) {
    try {
      slots = buildSlotGrid(draft.dateKey, {
        slotDurationMinutes: detail.data.slotDurationMinutes,
        opensTime: hours.opensTime.slice(0, 5),
        closesTime: hours.closesTime.slice(0, 5),
      })
    } catch {
      slots = []
    }
  }

  const update = (patch: Partial<BlockDraft>): void => {
    setConflicts(null)
    setSuccess(null)
    setDraft((current) => ({ ...current, ...patch }))
  }

  const create = useMutation({
    mutationFn: async (input: { draft: BlockDraft; force: boolean }): Promise<void> => {
      await apiClient.api.v1['court-maintenances'].$post({
        json: {
          court_id: input.draft.courtId,
          starts_at: input.draft.startsAt,
          ends_at: input.draft.endsAt,
          reason: input.draft.reason.trim(),
          force: input.force,
          // API menolak `force` tanpa konfirmasi eksplisit; operator sudah
          // melihat daftar booking yang akan dibatalkan sebelum sampai di sini.
          ...(input.force ? { confirm: true } : {}),
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['court-maintenances'] })
      await queryClient.invalidateQueries({ queryKey: ['slot-claims'] })
    },
  })

  const submit = async (force: boolean): Promise<void> => {
    if (!draft.courtId) {
      setError('Pilih lapangan yang akan diblokir.')
      return
    }
    if (!draft.startsAt || !draft.endsAt) {
      setError('Pilih jam mulai dan jam selesai blokir.')
      return
    }
    if (draft.startsAt >= draft.endsAt) {
      setError('Jam selesai harus setelah jam mulai.')
      return
    }
    if (draft.reason.trim().length === 0) {
      setError('Alasan blokir wajib diisi — alasan ini masuk ke audit log dan email customer.')
      return
    }

    setError(null)
    setConflicts(null)
    setSuccess(null)
    try {
      await create.mutateAsync({ draft, force })
      setSuccess(
        force
          ? 'Lapangan diblokir. Booking yang bentrok dibatalkan dan refund otomatis diajukan.'
          : 'Lapangan diblokir untuk rentang waktu tersebut.',
      )
      setDraft((current) => ({ ...current, startsAt: '', endsAt: '', reason: '' }))
    } catch (submissionError) {
      const found = parseConflicts(submissionError)
      if (found) {
        setConflicts(found)
        return
      }
      setError(formErrorMessage(submissionError))
    }
  }

  return (
    <form
      className="stack"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        void submit(false)
      }}
      noValidate
    >
      <div className="form-grid">
        <label className="field">
          <span>Lapangan</span>
          <select
            value={draft.courtId}
            onChange={(event) => update({ courtId: event.target.value, startsAt: '', endsAt: '' })}
            required
          >
            <option value="">Pilih lapangan</option>
            {(courts.data ?? []).map((court) => (
              <option value={court.id} key={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tanggal</span>
          <input
            type="date"
            value={draft.dateKey}
            onChange={(event) => update({ dateKey: event.target.value, startsAt: '', endsAt: '' })}
            required
          />
        </label>
        <label className="field">
          <span>Mulai</span>
          <select
            value={draft.startsAt}
            onChange={(event) => update({ startsAt: event.target.value })}
            disabled={slots.length === 0}
            required
          >
            <option value="">Pilih jam mulai</option>
            {slots.map((slot) => (
              <option value={slot.startsAt.toISOString()} key={slot.startsAt.toISOString()}>
                {formatTimeWita(slot.startsAt.toISOString())}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Selesai</span>
          <select
            value={draft.endsAt}
            onChange={(event) => update({ endsAt: event.target.value })}
            disabled={slots.length === 0}
            required
          >
            <option value="">Pilih jam selesai</option>
            {slots.map((slot) => (
              <option value={slot.endsAt.toISOString()} key={slot.endsAt.toISOString()}>
                {formatTimeWita(slot.endsAt.toISOString())}
              </option>
            ))}
          </select>
          <small>Rentang harus jatuh tepat di batas slot lapangan.</small>
        </label>
        <label className="field field-wide">
          <span>Alasan</span>
          <input
            value={draft.reason}
            onChange={(event) => update({ reason: event.target.value })}
            placeholder="Perbaikan jaring, pengecatan lantai, …"
            required
          />
        </label>
      </div>

      {draft.courtId && slots.length === 0 && !detail.isLoading ? (
        <p className="notice notice-warning">
          Lapangan ini tidak punya jam operasional untuk tanggal tersebut, jadi tidak ada slot yang
          dapat diblokir.
        </p>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="notice notice-success">{success}</p> : null}

      {conflicts ? (
        <div className="notice notice-danger" role="alert">
          <strong>Rentang ini bentrok dengan {conflicts.length} klaim slot.</strong>
          <ul>
            {conflicts.map((conflict) => (
              <li key={`${conflict.startsAt}-${conflict.claimType}`}>
                {formatTimeWita(conflict.startsAt)} — {labels.claimType(conflict.claimType).label}
              </li>
            ))}
          </ul>
          {isAdmin ? (
            <p>
              Blokir paksa akan <strong>membatalkan booking yang bentrok</strong>, mengajukan refund
              untuk pembayaran yang sudah lunas, dan mengirim email pembatalan ke customer. Tindakan
              ini tercatat di audit log dan tidak dapat dibatalkan.
            </p>
          ) : (
            <p>
              Hanya administrator yang dapat memaksa blokir dan membatalkan booking yang bentrok.
            </p>
          )}
        </div>
      ) : null}

      <div className="form-actions">
        <button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Memproses…' : 'Blokir lapangan'}
        </button>
        {conflicts && conflicts.length > 0 && isAdmin ? (
          <button
            className="button-danger"
            type="button"
            onClick={() => void submit(true)}
            disabled={create.isPending}
          >
            Blokir paksa &amp; batalkan {conflicts.length} klaim
          </button>
        ) : null}
      </div>
    </form>
  )
}

function MaintenanceList(): ReactNode {
  const queryClient = useQueryClient()
  const courts = useCourts()
  const [courtFilter, setCourtFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const maintenances = useMaintenances(courtFilter)

  const cancel = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.api.v1['court-maintenances'][':id'].cancel.$post({ param: { id } })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['court-maintenances'] })
      await queryClient.invalidateQueries({ queryKey: ['slot-claims'] })
    },
  })

  const courtName = (courtId: string): string =>
    courts.data?.find((court) => court.id === courtId)?.name ?? courtId

  const onCancel = async (maintenance: Maintenance): Promise<void> => {
    if (
      !globalThis.confirm(
        `Batalkan blokir ${courtName(maintenance.courtId)} pada ${formatDateTimeWita(maintenance.startsAt)}? Slot akan kembali dijual.`,
      )
    )
      return
    setError(null)
    try {
      await cancel.mutateAsync(maintenance.id)
    } catch (cancelError) {
      setError(formErrorMessage(cancelError))
    }
  }

  return (
    <div className="data-table-shell">
      <div className="table-controls">
        <label className="table-filter" htmlFor="maintenance-court">
          <span>Lapangan</span>
          <select
            id="maintenance-court"
            value={courtFilter}
            onChange={(event) => setCourtFilter(event.target.value)}
          >
            <option value="">Semua</option>
            {(courts.data ?? []).map((court) => (
              <option value={court.id} key={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <QueryState
        error={maintenances.error}
        isEmpty={(maintenances.data?.data.length ?? 0) === 0}
        emptyMessage="Belum ada blokir lapangan."
        isLoading={maintenances.isLoading}
        onRetry={() => void maintenances.refetch()}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Lapangan</th>
                <th scope="col">Mulai</th>
                <th scope="col">Selesai</th>
                <th scope="col">Alasan</th>
                <th scope="col">Status</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(maintenances.data?.data ?? []).map((maintenance) => (
                <tr key={maintenance.id}>
                  <td>{courtName(maintenance.courtId)}</td>
                  <td>{formatDateTimeWita(maintenance.startsAt)}</td>
                  <td>{formatDateTimeWita(maintenance.endsAt)}</td>
                  <td>{maintenance.reason}</td>
                  <td>
                    <StatusChip
                      label={maintenance.cancelledAt ? 'Dibatalkan' : 'Aktif'}
                      tone={maintenance.cancelledAt ? 'neutral' : 'danger'}
                    />
                  </td>
                  <td>
                    {maintenance.cancelledAt ? (
                      '—'
                    ) : (
                      <button
                        className="button-secondary button-small"
                        type="button"
                        onClick={() => void onCancel(maintenance)}
                        disabled={cancel.isPending}
                      >
                        Batalkan blokir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}

function MaintenancePage(): ReactNode {
  const session = useAuthSession()
  const isAdmin = session.user?.role === 'admin'

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Operasional</p>
        <h1>Blokir lapangan</h1>
        <p>
          Blokir menutup slot dari penjualan. Kalau rentangnya sudah dipesan, API menolak dan
          menampilkan klaim yang bentrok lebih dulu — pembatalan booking tidak pernah terjadi
          diam-diam.
        </p>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Blokir baru</h2>
          </div>
        </div>
        <MaintenanceForm isAdmin={isAdmin} />
      </div>

      <MaintenanceList />
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin', 'staff']}>
      <MaintenancePage />
    </RoleRouteGuard>
  )
}
