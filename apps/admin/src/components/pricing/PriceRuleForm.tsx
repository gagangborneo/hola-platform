'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import type { Court, Sport } from '../../lib/courts.ts'
import type { PriceRule } from '../../lib/price-rules.ts'
import { PRICE_RULES_QUERY_KEY } from '../../lib/price-rules.ts'
import { formErrorMessage } from '../common/form-error.ts'

type DayTypeValue = 'weekday' | 'weekend' | 'holiday' | 'specific_date'
type RateClassValue = 'peak' | 'offpeak' | 'special'

interface Draft {
  activeFrom: string
  activeTo: string
  courtId: string
  dayType: DayTypeValue
  endsTime: string
  isActive: boolean
  pricePerHourAmount: string
  priority: string
  rateClass: RateClassValue
  specificDate: string
  sportId: string
  startsTime: string
}

function emptyDraft(): Draft {
  return {
    courtId: '',
    sportId: '',
    dayType: 'weekday',
    specificDate: '',
    startsTime: '07:00',
    endsTime: '17:00',
    rateClass: 'offpeak',
    pricePerHourAmount: '',
    priority: '0',
    activeFrom: '',
    activeTo: '',
    isActive: true,
  }
}

function draftFrom(rule: PriceRule): Draft {
  return {
    courtId: rule.courtId ?? '',
    sportId: rule.sportId ?? '',
    dayType: rule.dayType,
    specificDate: rule.specificDate ?? '',
    startsTime: rule.startsTime.slice(0, 5),
    endsTime: rule.endsTime.slice(0, 5),
    rateClass: rule.rateClass,
    pricePerHourAmount: String(rule.pricePerHourAmount),
    priority: String(rule.priority),
    activeFrom: rule.activeFrom ?? '',
    activeTo: rule.activeTo ?? '',
    isActive: rule.isActive,
  }
}

function validate(draft: Draft): string | null {
  if (!draft.courtId && !draft.sportId) {
    return 'Aturan harus menyasar satu lapangan atau satu olahraga.'
  }
  if (draft.dayType === 'specific_date' && !draft.specificDate) {
    return 'Tanggal wajib diisi untuk jenis hari "tanggal tertentu".'
  }
  if (draft.dayType !== 'specific_date' && draft.specificDate) {
    return 'Tanggal hanya berlaku untuk jenis hari "tanggal tertentu".'
  }
  if (draft.startsTime >= draft.endsTime) return 'Jam selesai harus setelah jam mulai.'
  const price = Number(draft.pricePerHourAmount)
  if (!Number.isInteger(price) || price < 0) {
    return 'Harga per jam harus bilangan bulat rupiah tanpa desimal.'
  }
  if (!Number.isInteger(Number(draft.priority))) return 'Prioritas harus bilangan bulat.'
  if (draft.activeFrom && draft.activeTo && draft.activeFrom > draft.activeTo) {
    return 'Berlaku sampai tidak boleh sebelum berlaku dari.'
  }
  return null
}

function nullableDate(value: string): string | null {
  return value.length === 0 ? null : value
}

interface PriceRuleFormProps {
  courts: readonly Court[]
  onDone: () => void
  rule?: PriceRule
  sports: readonly Sport[]
}

export function PriceRuleForm({ courts, onDone, rule, sports }: PriceRuleFormProps): ReactNode {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft>(() => (rule ? draftFrom(rule) : emptyDraft()))
  const [error, setError] = useState<string | null>(null)

  const update = (patch: Partial<Draft>): void => setDraft((current) => ({ ...current, ...patch }))

  const save = useMutation({
    mutationFn: async (input: Draft): Promise<void> => {
      const body = {
        court_id: input.courtId.length > 0 ? input.courtId : null,
        sport_id: input.sportId.length > 0 ? input.sportId : null,
        day_type: input.dayType,
        specific_date: input.dayType === 'specific_date' ? input.specificDate : null,
        starts_time: input.startsTime,
        ends_time: input.endsTime,
        rate_class: input.rateClass,
        price_per_hour_amount: Number(input.pricePerHourAmount),
        priority: Number(input.priority),
        active_from: nullableDate(input.activeFrom),
        active_to: nullableDate(input.activeTo),
        is_active: input.isActive,
      }
      if (rule) {
        await apiClient.api.v1['price-rules'][':id'].$patch({ param: { id: rule.id }, json: body })
        return
      }
      await apiClient.api.v1['price-rules'].$post({ json: body })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRICE_RULES_QUERY_KEY })
      onDone()
    },
  })

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const message = validate(draft)
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
          <span>Lapangan</span>
          <select
            value={draft.courtId}
            onChange={(event) => update({ courtId: event.target.value })}
          >
            <option value="">Seluruh lapangan olahraga terpilih</option>
            {courts.map((court) => (
              <option value={court.id} key={court.id}>
                {court.name}
              </option>
            ))}
          </select>
          <small>Aturan per lapangan mengalahkan aturan per olahraga.</small>
        </label>
        <label className="field">
          <span>Olahraga</span>
          <select
            value={draft.sportId}
            onChange={(event) => update({ sportId: event.target.value })}
          >
            <option value="">Tidak dipakai</option>
            {sports.map((sport) => (
              <option value={sport.id} key={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Jenis hari</span>
          <select
            value={draft.dayType}
            onChange={(event) =>
              update({
                dayType: event.target.value as DayTypeValue,
                ...(event.target.value === 'specific_date' ? {} : { specificDate: '' }),
              })
            }
          >
            <option value="weekday">Hari kerja</option>
            <option value="weekend">Akhir pekan</option>
            <option value="holiday">Hari libur</option>
            <option value="specific_date">Tanggal tertentu</option>
          </select>
        </label>
        {draft.dayType === 'specific_date' ? (
          <label className="field">
            <span>Tanggal</span>
            <input
              type="date"
              value={draft.specificDate}
              onChange={(event) => update({ specificDate: event.target.value })}
              required
            />
          </label>
        ) : null}
        <label className="field">
          <span>Jam mulai</span>
          <input
            type="time"
            value={draft.startsTime}
            onChange={(event) => update({ startsTime: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Jam selesai</span>
          <input
            type="time"
            value={draft.endsTime}
            onChange={(event) => update({ endsTime: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Kelas tarif</span>
          <select
            value={draft.rateClass}
            onChange={(event) => update({ rateClass: event.target.value as RateClassValue })}
          >
            <option value="offpeak">Off-peak</option>
            <option value="peak">Peak</option>
            <option value="special">Spesial</option>
          </select>
        </label>
        <label className="field">
          <span>Harga per jam (Rp)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={draft.pricePerHourAmount}
            onChange={(event) => update({ pricePerHourAmount: event.target.value })}
            required
          />
          <small>Rupiah bulat tanpa desimal.</small>
        </label>
        <label className="field">
          <span>Prioritas</span>
          <input
            type="number"
            value={draft.priority}
            onChange={(event) => update({ priority: event.target.value })}
          />
          <small>Angka lebih besar dipilih lebih dulu saat dua aturan bertumpuk.</small>
        </label>
        <label className="field">
          <span>Berlaku dari</span>
          <input
            type="date"
            value={draft.activeFrom}
            onChange={(event) => update({ activeFrom: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Berlaku sampai</span>
          <input
            type="date"
            value={draft.activeTo}
            onChange={(event) => update({ activeTo: event.target.value })}
          />
        </label>
        <label className="field field-check">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => update({ isActive: event.target.checked })}
          />
          <span>Aturan aktif</span>
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : rule ? 'Simpan perubahan' : 'Buat aturan harga'}
        </button>
        <button
          className="button-secondary"
          type="button"
          onClick={onDone}
          disabled={save.isPending}
        >
          Batal
        </button>
      </div>
    </form>
  )
}
