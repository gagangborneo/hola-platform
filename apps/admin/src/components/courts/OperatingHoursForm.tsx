'use client'

import { Button, Input } from '@hola/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import type { CourtDetail, OperatingHour } from '../../lib/courts.ts'
import { formatDayName, toTimeInputValue } from '../../lib/format.ts'
import { formErrorMessage } from '../common/form-error.ts'

interface OperatingHoursFormProps {
  court: CourtDetail
}

interface HourDraft {
  closesTime: string
  dayOfWeek: number
  opensTime: string
}

/**
 * API menuntut tepat tujuh baris, satu per hari — tidak ada cara menyatakan
 * "hari ini tutup" lewat jam operasional. Penutupan satu hari diatur lewat
 * `special_dates` atau status lapangan, bukan dari formulir ini.
 */
const DEFAULT_OPENS = '07:00'
const DEFAULT_CLOSES = '23:00'

function toDrafts(hours: readonly OperatingHour[]): HourDraft[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const existing = hours.find((hour) => hour.dayOfWeek === dayOfWeek)
    return {
      dayOfWeek,
      opensTime: existing ? toTimeInputValue(existing.opensTime) : DEFAULT_OPENS,
      closesTime: existing ? toTimeInputValue(existing.closesTime) : DEFAULT_CLOSES,
    }
  })
}

export function OperatingHoursForm({ court }: OperatingHoursFormProps): ReactNode {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<HourDraft[]>(() => toDrafts(court.operatingHours))
  const [error, setError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  const save = useMutation({
    mutationFn: async (hours: HourDraft[]): Promise<void> => {
      await apiClient.api.v1.courts[':id']['operating-hours'].$put({
        param: { id: court.id },
        json: {
          hours: hours.map((hour) => ({
            day_of_week: hour.dayOfWeek,
            opens_time: hour.opensTime,
            closes_time: hour.closesTime,
          })),
        },
      })
    },
    onSuccess: async () => {
      setIsSaved(true)
      await queryClient.invalidateQueries({ queryKey: ['court-detail', court.id] })
    },
  })

  const update = (dayOfWeek: number, patch: Partial<HourDraft>): void => {
    setIsSaved(false)
    setDrafts((current) =>
      current.map((draft) => (draft.dayOfWeek === dayOfWeek ? { ...draft, ...patch } : draft)),
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const invalid = drafts.find((draft) => draft.opensTime >= draft.closesTime)
    if (invalid) {
      setError(`Jam tutup ${formatDayName(invalid.dayOfWeek)} harus setelah jam buka.`)
      return
    }
    setError(null)
    try {
      await save.mutateAsync(drafts)
    } catch (submissionError) {
      setError(formErrorMessage(submissionError))
    }
  }

  return (
    <form className="stack" onSubmit={(event) => void submit(event)} noValidate>
      <p className="muted">
        Tujuh hari wajib diisi. Jam tutup <code>24:00</code> sah dan berarti tutup tengah malam.
        Grid slot dihitung dari jam ini, jadi perubahannya langsung mengubah slot yang dijual.
      </p>
      <div className="hours-grid">
        {drafts.map((draft) => (
          <div className="hours-row" key={draft.dayOfWeek}>
            <span>{formatDayName(draft.dayOfWeek)}</span>
            <label className="field">
              <span className="sr-only">Jam buka {formatDayName(draft.dayOfWeek)}</span>
              <Input
                type="time"
                value={draft.opensTime}
                onChange={(event) => update(draft.dayOfWeek, { opensTime: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span className="sr-only">Jam tutup {formatDayName(draft.dayOfWeek)}</span>
              <Input
                type="time"
                value={draft.closesTime}
                onChange={(event) => update(draft.dayOfWeek, { closesTime: event.target.value })}
                required
              />
            </label>
          </div>
        ))}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {isSaved ? <p className="notice notice-success">Jam operasional tersimpan.</p> : null}
      <div className="form-actions">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : 'Simpan jam operasional'}
        </Button>
        <Button
          onClick={() => {
            setDrafts(toDrafts(court.operatingHours))
            setError(null)
            setIsSaved(false)
          }}
          disabled={save.isPending}
          variant="secondary"
        >
          Kembalikan
        </Button>
      </div>
    </form>
  )
}
