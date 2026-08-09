'use client'

import { buildSlotGrid } from '@hola/shared'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { QueryState } from '../../../components/common/QueryState.tsx'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import { apiClient } from '../../../lib/api-client.ts'
import { parseOffsetList } from '../../../lib/api-response.ts'
import { type Court, type CourtDetail, useCourtDetails, useCourts } from '../../../lib/courts.ts'
import {
  dayOfWeekFor,
  formatDateWita,
  formatTimeWita,
  shiftDateKey,
  todayWita,
} from '../../../lib/format.ts'
import * as labels from '../../../lib/labels.ts'
import {
  isSlotClaimResponse,
  normalizeSlotClaim,
  type SlotClaim,
} from '../../../lib/slot-claims.ts'

/** Cukup untuk satu hari di seluruh lapangan; batas per_page API adalah 100. */
const PAGE_SIZE = 100

function useSlotClaims(dateKey: string, courtId: string) {
  return useQuery({
    queryKey: ['slot-claims', dateKey, courtId],
    queryFn: async () => {
      const response = await apiClient.api.v1['slot-claims'].$get({
        query: {
          slot_date_from: dateKey,
          slot_date_to: dateKey,
          per_page: String(PAGE_SIZE),
          ...(courtId ? { court_id: courtId } : {}),
        },
      })
      const list = parseOffsetList(await response.json(), isSlotClaimResponse)
      return { ...list, data: list.data.map(normalizeSlotClaim) }
    },
    refetchInterval: 60_000,
  })
}

interface GridModel {
  /** ISO `starts_at` tiap baris, urut menaik dan gabungan seluruh lapangan. */
  rows: string[]
  /** `${courtId}|${startsAtIso}` → slot ada di jam operasional lapangan itu. */
  openSlots: Set<string>
}

/**
 * Sumbu waktu adalah gabungan grid seluruh lapangan yang ditampilkan, jadi
 * lapangan dengan jam buka berbeda tetap muat dalam satu tabel. Sel di luar jam
 * operasional sebuah lapangan dibiarkan kosong, bukan ditandai "tersedia".
 */
function buildGrid(
  dateKey: string,
  courts: readonly Court[],
  details: Map<string, CourtDetail>,
): GridModel {
  const dayOfWeek = dayOfWeekFor(dateKey)
  const rows = new Set<string>()
  const openSlots = new Set<string>()

  for (const court of courts) {
    const hours = details.get(court.id)?.operatingHours.find((hour) => hour.dayOfWeek === dayOfWeek)
    if (!hours) continue
    let slots: ReturnType<typeof buildSlotGrid>
    try {
      slots = buildSlotGrid(dateKey, {
        slotDurationMinutes: court.slotDurationMinutes,
        opensTime: hours.opensTime.slice(0, 5),
        closesTime: hours.closesTime.slice(0, 5),
      })
    } catch {
      // Jam operasional yang tidak masuk akal tidak boleh mematikan seluruh
      // kalender — lapangan itu saja yang tampil tanpa baris.
      continue
    }
    for (const slot of slots) {
      const iso = slot.startsAt.toISOString()
      rows.add(iso)
      openSlots.add(`${court.id}|${iso}`)
    }
  }

  return { rows: [...rows].sort(), openSlots }
}

function claimKey(claim: SlotClaim): string {
  return `${claim.courtId}|${new Date(claim.startsAt).toISOString()}`
}

function SlotCell({ claim, isOpen }: { claim: SlotClaim | undefined; isOpen: boolean }): ReactNode {
  if (!claim) {
    if (!isOpen) return <span className="slot-cell">&nbsp;</span>
    return <span className="slot-cell slot-free">Kosong</span>
  }
  const type = labels.claimType(claim.claimType)
  const status = labels.claimStatus(claim.status)
  const className = [
    'slot-cell',
    `slot-${claim.claimType}`,
    claim.status === 'held' ? 'slot-held' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const title =
    claim.status === 'held' && claim.holdExpiresAt
      ? `${type.label} · ${status.label} sampai ${formatTimeWita(claim.holdExpiresAt)}`
      : `${type.label} · ${status.label}`
  return (
    <span className={className} title={title}>
      {type.label}
    </span>
  )
}

function ScheduleGrid({
  claims,
  courts,
  dateKey,
  details,
}: {
  claims: readonly SlotClaim[]
  courts: readonly Court[]
  dateKey: string
  details: Map<string, CourtDetail>
}): ReactNode {
  // Tidak di-memo: `courts` dan `details` adalah objek baru tiap render, jadi
  // memo tidak akan pernah kena. Biayanya kecil — puluhan slot kali sepuluh
  // lapangan.
  const grid = buildGrid(dateKey, courts, details)
  const claimsByKey = useMemo(() => {
    const map = new Map<string, SlotClaim>()
    // Klaim yang dilepas tidak menutup slot; klaim aktif menimpanya kalau ada.
    for (const claim of claims) {
      if (claim.status === 'released' && map.has(claimKey(claim))) continue
      map.set(claimKey(claim), claim)
    }
    return map
  }, [claims])

  if (courts.length === 0) return <p className="table-state">Belum ada lapangan terdaftar.</p>
  if (grid.rows.length === 0) {
    return (
      <p className="table-state">
        Tidak ada jam operasional untuk tanggal ini. Periksa jam operasional lapangan.
      </p>
    )
  }

  return (
    <div className="calendar-scroll">
      <table className="calendar-grid">
        <thead>
          <tr>
            <th scope="col">Jam</th>
            {courts.map((court) => (
              <th scope="col" key={court.id}>
                {court.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((startsAt) => (
            <tr key={startsAt}>
              <th scope="row">{formatTimeWita(startsAt)}</th>
              {courts.map((court) => (
                <td key={court.id}>
                  <SlotCell
                    claim={claimsByKey.get(`${court.id}|${startsAt}`)}
                    isOpen={grid.openSlots.has(`${court.id}|${startsAt}`)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Legend(): ReactNode {
  return (
    <p className="legend">
      <span>
        <i className="slot-booking" /> Booking
      </span>
      <span>
        <i className="slot-maintenance" /> Maintenance
      </span>
      <span>
        <i className="slot-event" /> Event / match
      </span>
      <span>
        <i className="slot-free" /> Kosong
      </span>
      <span>Garis putus-putus menandai slot yang masih berstatus hold.</span>
    </p>
  )
}

function SchedulePage(): ReactNode {
  const [dateKey, setDateKey] = useState(() => todayWita(new Date()))
  const [courtId, setCourtId] = useState('')
  const courtsQuery = useCourts()

  const allCourts = courtsQuery.data ?? []
  const visibleCourts = courtId ? allCourts.filter((court) => court.id === courtId) : allCourts
  const details = useCourtDetails(visibleCourts.map((court) => court.id))
  const claimsQuery = useSlotClaims(dateKey, courtId)

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Operasional</p>
        <h1>Jadwal slot</h1>
        <p>
          Isi kalender dibaca dari klaim slot, sumber kebenaran yang sama yang mencegah booking
          ganda. Event dan match Phase 2 &amp; 4 akan muncul di sini tanpa perubahan halaman.
        </p>
      </div>

      <div className="data-table-shell">
        <div className="table-controls">
          <label className="table-filter" htmlFor="schedule-date">
            <span>Tanggal</span>
            <input
              id="schedule-date"
              type="date"
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value)}
            />
          </label>
          <label className="table-filter" htmlFor="schedule-court">
            <span>Lapangan</span>
            <select
              id="schedule-court"
              value={courtId}
              onChange={(event) => setCourtId(event.target.value)}
            >
              <option value="">Semua lapangan</option>
              {allCourts.map((court) => (
                <option value={court.id} key={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <button
              className="button-secondary"
              type="button"
              onClick={() => setDateKey((current) => shiftDateKey(current, -1))}
            >
              ← Kemarin
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={() => setDateKey(todayWita(new Date()))}
            >
              Hari ini
            </button>
            <button
              className="button-secondary"
              type="button"
              onClick={() => setDateKey((current) => shiftDateKey(current, 1))}
            >
              Besok →
            </button>
          </div>
        </div>

        <div className="panel-body">
          <p className="muted">{formatDateWita(`${dateKey}T00:00:00+08:00`)}</p>
          <QueryState
            error={claimsQuery.error ?? courtsQuery.error ?? details.error}
            isLoading={claimsQuery.isLoading || courtsQuery.isLoading || details.isLoading}
            onRetry={() => void claimsQuery.refetch()}
          >
            <ScheduleGrid
              claims={claimsQuery.data?.data ?? []}
              courts={visibleCourts}
              dateKey={dateKey}
              details={details.byId}
            />
            <Legend />
            {(claimsQuery.data?.pagination.totalCount ?? 0) > PAGE_SIZE ? (
              <p className="notice notice-warning">
                Hari ini memiliki lebih dari {PAGE_SIZE} klaim slot. Saring per lapangan agar
                seluruh klaim terlihat.
              </p>
            ) : null}
          </QueryState>
        </div>
      </div>
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin', 'staff']}>
      <SchedulePage />
    </RoleRouteGuard>
  )
}
