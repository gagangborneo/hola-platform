'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { QueryState } from '../../../components/common/QueryState.tsx'
import { StatusChip } from '../../../components/common/StatusChip.tsx'
import { CourtForm } from '../../../components/courts/CourtForm.tsx'
import { CourtPhotosForm } from '../../../components/courts/CourtPhotosForm.tsx'
import { OperatingHoursForm } from '../../../components/courts/OperatingHoursForm.tsx'
import { RoleRouteGuard } from '../../../components/shell/RoleRouteGuard.tsx'
import { useCourtDetail, useCourts, useSports } from '../../../lib/courts.ts'
import * as labels from '../../../lib/labels.ts'

type EditorTab = 'detail' | 'hours' | 'photos'

const TABS: ReadonlyArray<{ id: EditorTab; label: string }> = [
  { id: 'detail', label: 'Detail' },
  { id: 'hours', label: 'Jam operasional' },
  { id: 'photos', label: 'Foto' },
]

function CourtEditor({ courtId, onSaved }: { courtId: string; onSaved: () => void }): ReactNode {
  const [tab, setTab] = useState<EditorTab>('detail')
  const detail = useCourtDetail(courtId)
  const sports = useSports()

  return (
    <div className="panel">
      <QueryState
        error={detail.error}
        isLoading={detail.isLoading}
        onRetry={() => void detail.refetch()}
      >
        {detail.data ? (
          <div className="stack">
            <div className="panel-heading">
              <div>
                <h2>{detail.data.name}</h2>
                <p>
                  {detail.data.code} · versi {detail.data.version}
                </p>
              </div>
              <StatusChip {...labels.courtStatus(detail.data.status)} />
            </div>

            <div className="tab-bar" role="tablist">
              {TABS.map((item) => (
                <button
                  aria-selected={tab === item.id}
                  key={item.id}
                  role="tab"
                  type="button"
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'detail' ? (
              <CourtForm
                court={detail.data}
                defaultVenueId={detail.data.venueId}
                onDone={onSaved}
                sports={sports.data ?? []}
              />
            ) : null}
            {tab === 'hours' ? <OperatingHoursForm court={detail.data} /> : null}
            {tab === 'photos' ? <CourtPhotosForm court={detail.data} /> : null}
          </div>
        ) : null}
      </QueryState>
    </div>
  )
}

function CourtsPage(): ReactNode {
  const courts = useCourts()
  const sports = useSports()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const sportName = (sportId: string): string =>
    sports.data?.find((sport) => sport.id === sportId)?.name ?? '—'
  const defaultVenueId = courts.data?.[0]?.venueId ?? ''

  return (
    <section className="page-stack">
      <div className="page-heading-row">
        <div className="page-heading">
          <p className="eyebrow">Konfigurasi</p>
          <h1>Lapangan</h1>
          <p>
            Lapangan, jam operasional, dan foto. Data ini yang menentukan slot mana yang dijual —
            perubahannya langsung terlihat customer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCreating((current) => !current)
            setSelectedId(null)
          }}
        >
          {isCreating ? 'Tutup formulir' : 'Tambah lapangan'}
        </button>
      </div>

      {isCreating ? (
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Lapangan baru</h2>
              <p>Jam operasional dan foto diisi setelah lapangan dibuat.</p>
            </div>
          </div>
          <CourtForm
            defaultVenueId={defaultVenueId}
            onDone={(courtId) => {
              setIsCreating(false)
              setSelectedId(courtId)
            }}
            sports={sports.data ?? []}
          />
        </div>
      ) : null}

      <div className="data-table-shell">
        <QueryState
          error={courts.error}
          isEmpty={(courts.data?.length ?? 0) === 0}
          emptyMessage="Belum ada lapangan. Tambahkan lapangan pertama untuk mulai menjual slot."
          isLoading={courts.isLoading}
          onRetry={() => void courts.refetch()}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Lapangan</th>
                  <th scope="col">Olahraga</th>
                  <th scope="col">Slot</th>
                  <th scope="col">Batas booking</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(courts.data ?? []).map((court) => (
                  <tr key={court.id}>
                    <td>
                      <strong>{court.name}</strong>
                      <br />
                      {court.code}
                    </td>
                    <td>{sportName(court.sportId)}</td>
                    <td>
                      {court.slotDurationMinutes} menit
                      <br />
                      {court.isIndoor ? 'Indoor' : 'Outdoor'}
                    </td>
                    <td>
                      {court.minSlotsPerBooking}–{court.maxSlotsPerBooking} slot
                    </td>
                    <td>
                      <StatusChip {...labels.courtStatus(court.status)} />
                    </td>
                    <td>
                      <button
                        className="button-secondary button-small"
                        type="button"
                        onClick={() => {
                          setIsCreating(false)
                          setSelectedId((current) => (current === court.id ? null : court.id))
                        }}
                      >
                        {selectedId === court.id ? 'Tutup' : 'Kelola'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>

      {selectedId ? (
        // `key` memaksa remount saat lapangan berganti supaya draf formulir di
        // dalamnya tidak terbawa dari lapangan sebelumnya.
        <CourtEditor courtId={selectedId} key={selectedId} onSaved={() => void courts.refetch()} />
      ) : null}
    </section>
  )
}

export default function Page(): ReactNode {
  return (
    <RoleRouteGuard allowedRoles={['admin']}>
      <CourtsPage />
    </RoleRouteGuard>
  )
}
