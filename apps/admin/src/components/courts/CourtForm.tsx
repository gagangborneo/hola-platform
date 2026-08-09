'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { parseData } from '../../lib/api-response.ts'
import {
  COURTS_QUERY_KEY,
  type Court,
  type CourtDetail,
  type CourtStatusValue,
  isCourtResponse,
  normalizeCourt,
  type Sport,
} from '../../lib/courts.ts'
import { formErrorMessage } from '../common/form-error.ts'

const SLOT_DURATIONS = [30, 60, 90, 120] as const
type SlotDuration = (typeof SLOT_DURATIONS)[number]

interface Draft {
  code: string
  description: string
  isIndoor: boolean
  maxPlayers: string
  maxSlotsPerBooking: string
  minSlotsPerBooking: string
  name: string
  slotDurationMinutes: SlotDuration
  sortOrder: string
  sportId: string
  status: CourtStatusValue
  surface: string
  venueId: string
}

function emptyDraft(venueId: string, sportId: string): Draft {
  return {
    code: '',
    name: '',
    description: '',
    surface: '',
    isIndoor: false,
    slotDurationMinutes: 60,
    minSlotsPerBooking: '1',
    maxSlotsPerBooking: '4',
    maxPlayers: '',
    status: 'active',
    sortOrder: '0',
    venueId,
    sportId,
  }
}

function draftFrom(court: CourtDetail): Draft {
  return {
    code: court.code,
    name: court.name,
    description: court.description ?? '',
    surface: court.surface ?? '',
    isIndoor: court.isIndoor,
    slotDurationMinutes: (SLOT_DURATIONS.find(
      (duration) => duration === court.slotDurationMinutes,
    ) ?? 60) as SlotDuration,
    minSlotsPerBooking: String(court.minSlotsPerBooking),
    maxSlotsPerBooking: String(court.maxSlotsPerBooking),
    maxPlayers: court.maxPlayers === null ? '' : String(court.maxPlayers),
    status: court.status,
    sortOrder: String(court.sortOrder),
    venueId: court.venueId,
    sportId: court.sportId,
  }
}

function optionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function positiveIntOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function validate(draft: Draft, isCreate: boolean): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(draft.code.trim())) {
    // Kode ini masuk apa adanya ke segmen URL `/lapangan/[kode]` di web.
    return 'Kode hanya boleh berisi huruf, angka, "_", dan "-".'
  }
  if (draft.name.trim().length === 0) return 'Nama lapangan wajib diisi.'
  const min = Number(draft.minSlotsPerBooking)
  const max = Number(draft.maxSlotsPerBooking)
  if (!Number.isInteger(min) || min < 1) return 'Minimal slot per booking harus bilangan bulat ≥ 1.'
  if (!Number.isInteger(max) || max < 1)
    return 'Maksimal slot per booking harus bilangan bulat ≥ 1.'
  if (min > max) return 'Minimal slot per booking tidak boleh melebihi maksimal.'
  if (draft.maxPlayers.trim().length > 0 && positiveIntOrNull(draft.maxPlayers) === null) {
    return 'Maksimal pemain harus bilangan bulat positif atau dikosongkan.'
  }
  if (!Number.isInteger(Number(draft.sortOrder))) return 'Urutan tampil harus bilangan bulat.'
  if (isCreate && draft.venueId.trim().length === 0) return 'Venue wajib dipilih.'
  if (isCreate && draft.sportId.trim().length === 0) return 'Olahraga wajib dipilih.'
  return null
}

interface CourtFormProps {
  court?: CourtDetail
  defaultVenueId: string
  onDone: (courtId: string) => void
  sports: readonly Sport[]
}

/**
 * Satu formulir untuk buat dan ubah. `PATCH` memakai `If-Match` berisi versi
 * lapangan: kalau operator lain menyimpan lebih dulu, API menolak dengan
 * konflik alih-alih diam-diam menimpa perubahan itu.
 */
export function CourtForm({ court, defaultVenueId, onDone, sports }: CourtFormProps): ReactNode {
  const isCreate = court === undefined
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft>(() =>
    court ? draftFrom(court) : emptyDraft(defaultVenueId, sports[0]?.id ?? ''),
  )
  const [error, setError] = useState<string | null>(null)

  const update = (patch: Partial<Draft>): void => {
    setDraft((current) => ({ ...current, ...patch }))
  }

  const save = useMutation({
    mutationFn: async (input: Draft): Promise<Court> => {
      const shared = {
        code: input.code.trim(),
        name: input.name.trim(),
        description: optionalText(input.description),
        surface: optionalText(input.surface),
        is_indoor: input.isIndoor,
        slot_duration_minutes: input.slotDurationMinutes,
        min_slots_per_booking: Number(input.minSlotsPerBooking),
        max_slots_per_booking: Number(input.maxSlotsPerBooking),
        max_players: positiveIntOrNull(input.maxPlayers),
        status: input.status,
        sort_order: Number(input.sortOrder),
      }

      if (court) {
        const response = await apiClient.api.v1.courts[':id'].$patch(
          { param: { id: court.id }, json: shared },
          { headers: { 'If-Match': String(court.version) } },
        )
        return normalizeCourt(parseData(await response.json(), isCourtResponse))
      }

      const response = await apiClient.api.v1.courts.$post({
        json: { ...shared, venue_id: input.venueId.trim(), sport_id: input.sportId },
      })
      return normalizeCourt(parseData(await response.json(), isCourtResponse))
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: COURTS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['court-detail', saved.id] })
      onDone(saved.id)
    },
  })

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const message = validate(draft, isCreate)
    if (message) {
      setError(message)
      return
    }
    setError(null)
    try {
      await save.mutateAsync(draft)
    } catch (submissionError) {
      setError(formErrorMessage(submissionError))
    }
  }

  return (
    <form className="stack" onSubmit={(event) => void submit(event)} noValidate>
      <div className="form-grid">
        <label className="field">
          <span>Kode</span>
          <input
            value={draft.code}
            onChange={(event) => update({ code: event.target.value })}
            placeholder="PDL-01"
            required
          />
          <small>Dipakai sebagai alamat halaman publik lapangan.</small>
        </label>
        <label className="field">
          <span>Nama</span>
          <input
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
            required
          />
        </label>
        {isCreate ? (
          <>
            <label className="field">
              <span>Olahraga</span>
              <select
                value={draft.sportId}
                onChange={(event) => update({ sportId: event.target.value })}
                required
              >
                <option value="">Pilih olahraga</option>
                {sports.map((sport) => (
                  <option value={sport.id} key={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Venue</span>
              <input
                value={draft.venueId}
                onChange={(event) => update({ venueId: event.target.value })}
                required
              />
              <small>
                Terisi dari lapangan yang sudah ada. Belum ada endpoint daftar venue di Phase 1.
              </small>
            </label>
          </>
        ) : null}
        <label className="field">
          <span>Status</span>
          <select
            value={draft.status}
            onChange={(event) => update({ status: event.target.value as CourtStatusValue })}
          >
            <option value="active">Aktif — dijual</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Nonaktif — tidak dijual</option>
          </select>
        </label>
        <label className="field">
          <span>Durasi slot</span>
          <select
            value={String(draft.slotDurationMinutes)}
            onChange={(event) =>
              update({ slotDurationMinutes: Number(event.target.value) as SlotDuration })
            }
          >
            {SLOT_DURATIONS.map((duration) => (
              <option value={String(duration)} key={duration}>
                {duration} menit
              </option>
            ))}
          </select>
          <small>Mengubahnya menggeser seluruh grid slot lapangan ini.</small>
        </label>
        <label className="field">
          <span>Minimal slot per booking</span>
          <input
            type="number"
            min="1"
            value={draft.minSlotsPerBooking}
            onChange={(event) => update({ minSlotsPerBooking: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Maksimal slot per booking</span>
          <input
            type="number"
            min="1"
            value={draft.maxSlotsPerBooking}
            onChange={(event) => update({ maxSlotsPerBooking: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Permukaan</span>
          <input
            value={draft.surface}
            onChange={(event) => update({ surface: event.target.value })}
            placeholder="artificial_grass"
          />
        </label>
        <label className="field">
          <span>Maksimal pemain</span>
          <input
            type="number"
            min="1"
            value={draft.maxPlayers}
            onChange={(event) => update({ maxPlayers: event.target.value })}
            placeholder="Kosongkan bila tidak dibatasi"
          />
        </label>
        <label className="field">
          <span>Urutan tampil</span>
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(event) => update({ sortOrder: event.target.value })}
          />
        </label>
        <label className="field field-check">
          <input
            type="checkbox"
            checked={draft.isIndoor}
            onChange={(event) => update({ isIndoor: event.target.checked })}
          />
          <span>Lapangan indoor</span>
        </label>
        <label className="field field-wide">
          <span>Deskripsi</span>
          <input
            value={draft.description}
            onChange={(event) => update({ description: event.target.value })}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : isCreate ? 'Buat lapangan' : 'Simpan perubahan'}
        </button>
      </div>
    </form>
  )
}
