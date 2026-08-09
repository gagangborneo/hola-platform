'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, MonitorSmartphone, TriangleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { authStore } from '../../lib/auth.ts'
import { AUTH_SESSIONS_QUERY_KEY, fetchAuthSessions } from '../../lib/auth-sessions.ts'
import { displayErrorMessage } from '../../lib/error-message.ts'
import { formatDateWita, formatTimeWita } from '../../lib/format.ts'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { Skeleton } from '../ui/skeleton.tsx'
import { sessionDeviceName } from './session-device.ts'

/**
 * Daftar perangkat yang masih memegang sesi (`GET /auth/sessions`).
 *
 * Sesi milik tab ini TIDAK ditandai: refresh token-nya hidup di cookie HttpOnly
 * yang tidak dapat dibaca JavaScript (S-5), jadi halaman ini tidak punya cara
 * jujur untuk mengenali barisnya sendiri. Yang bisa dilakukan adalah
 * mengatakannya apa adanya, bukan menebak lewat User-Agent yang mudah sama
 * persis antar dua tab di perangkat yang sama.
 */
export function SessionList(): ReactNode {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const sessions = useQuery({
    queryKey: AUTH_SESSIONS_QUERY_KEY,
    queryFn: fetchAuthSessions,
  })

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.api.v1.auth.sessions[':id'].$delete({ param: { id } })
    },
    onSuccess: () => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: AUTH_SESSIONS_QUERY_KEY })
    },
    onError: (mutationError: Error) =>
      setError(displayErrorMessage(mutationError, 'Perangkat gagal dikeluarkan. Coba lagi.')),
  })

  const logoutAll = useMutation({
    mutationFn: async () => {
      await apiClient.api.v1.auth['logout-all'].$post()
    },
    // `logout-all` menaikkan `token_version`, jadi access token yang dipegang
    // tab ini ikut mati saat itu juga — sesi lokal dibersihkan lalu diarahkan
    // ke login, bukan dibiarkan menabrak 401 di request berikutnya.
    onSuccess: () => {
      authStore.clearAccessToken()
      router.replace('/login')
    },
    onError: (mutationError: Error) =>
      setError(displayErrorMessage(mutationError, 'Gagal keluar dari semua perangkat. Coba lagi.')),
  })

  const rows = sessions.data?.data ?? []

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Perangkat aktif</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sesi yang masih dapat memperbarui login tanpa memasukkan password lagi.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={logoutAll.isPending || rows.length === 0}
          onClick={() => logoutAll.mutate()}
        >
          <LogOut className="size-4" aria-hidden />
          {logoutAll.isPending ? 'Memproses…' : 'Keluar dari semua perangkat'}
        </Button>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-sm text-secondary-foreground">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        Perangkat yang kamu pakai sekarang juga ada di daftar ini. Kalau kamu mengeluarkannya, kamu
        akan diminta masuk lagi saat sesi ini diperbarui.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">
          {error}
        </p>
      ) : null}

      {sessions.isPending ? (
        <div className="mt-5 grid gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : null}

      {sessions.isError ? (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="font-semibold text-foreground">Daftar perangkat gagal dimuat.</p>
          <Button className="mt-4" variant="outline" onClick={() => void sessions.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!sessions.isPending && !sessions.isError && rows.length === 0 ? (
        <p className="mt-5 text-muted-foreground">Tidak ada sesi aktif selain sesi saat ini.</p>
      ) : null}

      <ul className="mt-5 grid gap-3">
        {rows.map((session) => (
          <li key={session.id}>
            <Card className="flex flex-wrap items-start gap-4 p-4">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
                aria-hidden
              >
                <MonitorSmartphone className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{sessionDeviceName(session)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Masuk {formatDateWita(session.created_at)}
                  {session.last_used_at
                    ? ` · terakhir dipakai ${formatDateWita(session.last_used_at)} ${formatTimeWita(session.last_used_at)} WITA`
                    : null}
                </p>
                {session.ip_address ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">IP {session.ip_address}</p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(session.id)}
              >
                Keluarkan
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
