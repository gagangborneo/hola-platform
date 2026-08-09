'use client'

import type { NotificationPrefs } from '@hola/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { displayErrorMessage } from '../../lib/error-message.ts'
import { fetchMyProfile, MY_PROFILE_QUERY_KEY } from '../../lib/my-profile.ts'
import { Checkbox } from '../ui/checkbox.tsx'
import { Label } from '../ui/label.tsx'
import { Skeleton } from '../ui/skeleton.tsx'

interface ChannelCopy {
  key: keyof NotificationPrefs
  label: string
  description: string
  /** Kanal yang adapternya belum aktif di rilis ini (docs/00 § 6 D-04, docs/15). */
  inactiveNote?: string
}

const CHANNELS: readonly ChannelCopy[] = [
  {
    key: 'email',
    label: 'Email',
    description: 'Konfirmasi booking, e-receipt, dan kabar pengembalian dana.',
  },
  {
    key: 'push',
    label: 'Notifikasi aplikasi',
    description: 'Pengingat jadwal main langsung di ponsel.',
    inactiveNote: 'Aktif setelah aplikasi Hola rilis.',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    description: 'Pengingat lewat pesan WhatsApp.',
    inactiveNote: 'Kanal ini belum diaktifkan.',
  },
]

/**
 * Preferensi kanal notifikasi (`PUT /me/notification-prefs`, CRM-9).
 *
 * Pemberitahuan transaksional — konfirmasi booking, reset password, pembatalan —
 * SELALU dikirim tanpa memandang pilihan di sini (docs/02 § 7 aturan 3). Itu
 * dinyatakan di layar supaya pengguna tidak mengira mematikan email berarti
 * kehilangan bukti pemesanannya.
 */
export function NotificationPreferences(): ReactNode {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const profile = useQuery({ queryKey: MY_PROFILE_QUERY_KEY, queryFn: fetchMyProfile })

  const save = useMutation({
    mutationFn: async (prefs: NotificationPrefs) => {
      const response = await apiClient.api.v1.me['notification-prefs'].$put({ json: prefs })
      return response.json()
    },
    onSuccess: () => {
      setError(null)
      setNotice('Preferensi notifikasi tersimpan.')
      void queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY })
    },
    onError: (mutationError: Error) => {
      setNotice(null)
      setError(displayErrorMessage(mutationError, 'Preferensi gagal disimpan. Coba lagi.'))
    },
  })

  if (profile.isPending) return <Skeleton className="h-64 w-full rounded-xl" />
  // Akun staf/admin tidak punya baris `customer_profiles`, jadi tidak punya
  // preferensi untuk disetel — kartunya disembunyikan, bukan ditampilkan mati.
  if (profile.isError || !profile.data?.data.profile) return null

  // Serializer API selalu melengkapi kanal yang hilang, jadi ketiganya pasti ada.
  const prefs = profile.data.data.profile.notification_prefs

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-foreground">Preferensi notifikasi</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pemberitahuan penting seperti konfirmasi booking, pembatalan, dan keamanan akun tetap
        dikirim meskipun kanalnya dimatikan di sini.
      </p>

      <div className="mt-5 grid gap-4">
        {CHANNELS.map((channel) => (
          <div key={channel.key} className="flex items-start gap-3">
            <Checkbox
              id={`notif-${channel.key}`}
              className="mt-1"
              checked={prefs[channel.key]}
              disabled={save.isPending}
              onCheckedChange={(checked) =>
                save.mutate({ ...prefs, [channel.key]: checked === true })
              }
            />
            <div className="min-w-0">
              <Label htmlFor={`notif-${channel.key}`}>{channel.label}</Label>
              <p className="mt-0.5 text-sm text-muted-foreground">{channel.description}</p>
              {channel.inactiveNote ? (
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {channel.inactiveNote}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mt-4 font-semibold text-primary">{notice}</p> : null}
    </section>
  )
}
