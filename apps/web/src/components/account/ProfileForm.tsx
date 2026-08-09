'use client'

import {
  GENDER_VALUES,
  SKILL_LEVEL_VALUES,
  type UpdateMyProfileInput,
  updateMyProfileSchema,
} from '@hola/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent, ReactNode, SelectHTMLAttributes } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { cn } from '../../lib/cn.ts'
import { displayErrorMessage } from '../../lib/error-message.ts'
import { fetchMyProfile, MY_PROFILE_QUERY_KEY, type MyProfile } from '../../lib/my-profile.ts'
import { validationErrorMessage } from '../auth/auth-form.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import { Skeleton } from '../ui/skeleton.tsx'
import { AccountIdentityCard } from './AccountIdentityCard.tsx'

const GENDER_LABEL: Record<(typeof GENDER_VALUES)[number], string> = {
  male: 'Laki-laki',
  female: 'Perempuan',
  undisclosed: 'Tidak disebutkan',
}

const SKILL_LEVEL_LABEL: Record<(typeof SKILL_LEVEL_VALUES)[number], string> = {
  beginner: 'Pemula',
  intermediate: 'Menengah',
  advanced: 'Mahir',
}

/**
 * `<select>` bawaan, bukan komponen `Select` Radix di `components/ui`: setiap
 * field di bawah boleh kosong, sedangkan Radix melarang `SelectItem` bernilai
 * string kosong (nilai itu dicadangkan untuk membersihkan pilihan). Form ini
 * dibaca lewat `FormData` seperti form login, jadi kontrol asli juga menghemat
 * satu lapis state.
 */
function FieldSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>): ReactNode {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-lg border bg-input-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  )
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

/** Field kosong berarti "kosongkan", yang di kontrak `PATCH /me/profile` adalah `null`. */
function nullableValue(formData: FormData, key: string): string | null {
  return formValue(formData, key) || null
}

function ProfileFormSkeleton(): ReactNode {
  return (
    <div className="grid gap-5">
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}

interface ProfileFieldsProps {
  profile: MyProfile
  sports: ReadonlyArray<{ id: string; name: string }>
  onSaved: (updated: MyProfile) => void
}

function ProfileFields({ profile, sports, onSaved }: ProfileFieldsProps): ReactNode {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const customer = profile.profile

  const save = useMutation({
    mutationFn: async (input: UpdateMyProfileInput) => {
      const response = await apiClient.api.v1.me.profile.$patch({ json: input })
      return response.json()
    },
    onSuccess: (body) => {
      setError(null)
      setNotice('Perubahan profil tersimpan.')
      onSaved(body.data)
    },
    onError: (mutationError: Error) => {
      setNotice(null)
      setError(displayErrorMessage(mutationError, 'Perubahan gagal disimpan. Coba lagi.'))
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    // Schema yang sama dengan yang ditegakkan server (F0-71): pesan "Nomor HP
    // harus berformat +62…" di sini tidak akan pernah berbeda dari pesan API.
    const parsed = updateMyProfileSchema.safeParse({
      full_name: formValue(formData, 'full_name'),
      phone: nullableValue(formData, 'phone'),
      ...(customer
        ? {
            birth_date: nullableValue(formData, 'birth_date'),
            gender: nullableValue(formData, 'gender'),
            skill_level: nullableValue(formData, 'skill_level'),
            preferred_sport_id: nullableValue(formData, 'preferred_sport_id'),
          }
        : {}),
    })
    if (!parsed.success) {
      setNotice(null)
      setError(validationErrorMessage(parsed.error.issues))
      return
    }
    save.mutate(parsed.data)
  }

  return (
    <form className="rounded-xl border bg-card p-5 sm:p-6" onSubmit={onSubmit} noValidate>
      <h2 className="font-display text-lg font-bold text-foreground">Data diri</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Nama dan nomor HP dipakai staf saat check-in dan saat kami perlu menghubungimu soal pesanan.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="full_name">Nama lengkap</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={profile.full_name}
            autoComplete="name"
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="phone">Nomor HP</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="+62812…"
            defaultValue={profile.phone ?? ''}
            autoComplete="tel"
          />
          <p className="text-xs text-muted-foreground">
            Nomor yang diganti harus diverifikasi ulang sebelum dipakai untuk masuk.
          </p>
        </div>

        {customer ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="birth_date">Tanggal lahir</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                defaultValue={customer.birth_date ?? ''}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="gender">Jenis kelamin</Label>
              <FieldSelect id="gender" name="gender" defaultValue={customer.gender ?? ''}>
                <option value="">Tidak diisi</option>
                {GENDER_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {GENDER_LABEL[value]}
                  </option>
                ))}
              </FieldSelect>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="skill_level">Level bermain</Label>
              <FieldSelect
                id="skill_level"
                name="skill_level"
                defaultValue={customer.skill_level ?? ''}
              >
                <option value="">Tidak diisi</option>
                {SKILL_LEVEL_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {SKILL_LEVEL_LABEL[value]}
                  </option>
                ))}
              </FieldSelect>
              <p className="text-xs text-muted-foreground">
                Dilaporkan sendiri — dipakai saat mencari lawan tanding yang sepadan.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="preferred_sport_id">Olahraga favorit</Label>
              <FieldSelect
                id="preferred_sport_id"
                name="preferred_sport_id"
                defaultValue={customer.preferred_sport_id ?? ''}
              >
                <option value="">Tidak diisi</option>
                {sports.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </FieldSelect>
            </div>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mt-4 font-semibold text-primary">{notice}</p> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Menyimpan…' : 'Simpan perubahan'}
        </Button>
      </div>
    </form>
  )
}

function MembershipCard({ profile }: { profile: MyProfile }): ReactNode {
  const customer = profile.profile
  if (!customer) return null

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-foreground">Keanggotaan</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Tier
          </dt>
          <dd className="mt-1 font-display text-lg font-bold capitalize text-primary">
            {customer.tier_code}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Poin terkumpul
          </dt>
          <dd className="mt-1 font-display text-lg font-bold text-primary">
            {customer.lifetime_points}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Kode referral
          </dt>
          <dd className="mt-1 font-display text-lg font-bold text-primary">
            {customer.referral_code}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        Penukaran poin dan keuntungan tier menyusul bersama program membership.
      </p>
    </section>
  )
}

export function ProfileForm(): ReactNode {
  const queryClient = useQueryClient()
  const profile = useQuery({ queryKey: MY_PROFILE_QUERY_KEY, queryFn: fetchMyProfile })
  const sports = useQuery({
    queryKey: ['sports'],
    queryFn: async () => {
      const response = await apiClient.api.v1.sports.$get()
      return response.json()
    },
  })

  if (profile.isPending) return <ProfileFormSkeleton />

  if (profile.isError || !profile.data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="font-semibold text-foreground">Profil gagal dimuat.</p>
        <p className="mt-1 text-muted-foreground">Periksa koneksi lalu coba lagi.</p>
        <Button className="mt-4" variant="outline" onClick={() => void profile.refetch()}>
          Coba lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <AccountIdentityCard profile={profile.data.data} />
      <ProfileFields
        profile={profile.data.data}
        sports={sports.data?.data ?? []}
        // Respons PATCH sudah berisi profil lengkap hasil simpan, jadi cache
        // ditulis langsung: refetch hanya akan mengambil data yang sama sekali
        // lagi, dan remount form akan menghapus pesan "tersimpan" yang baru muncul.
        onSaved={(updated) => {
          queryClient.setQueryData(MY_PROFILE_QUERY_KEY, { data: updated })
        }}
      />
      <MembershipCard profile={profile.data.data} />
    </div>
  )
}
