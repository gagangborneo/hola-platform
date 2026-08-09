'use client'

import { Button, Card, cn, Skeleton } from '@hola/ui'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BellRing, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { displayErrorMessage } from '../../lib/error-message.ts'
import { formatDateWita, formatTimeWita } from '../../lib/format.ts'
import { EmptyState } from '../common/EmptyState.tsx'
import { notificationCopy, notificationHref } from './notification-labels.ts'

const NOTIFICATIONS_QUERY_KEY = ['my-notifications'] as const

function NotificationSkeleton(): ReactNode {
  return (
    <Card className="flex items-start gap-4 p-4 sm:p-5">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
    </Card>
  )
}

export function NotificationInbox(): ReactNode {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const notifications = useInfiniteQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      // `createHolaClient` melempar `HolaApiError` untuk respons non-2xx apa pun,
      // jadi kegagalan ditangani lewat `notifications.isError`, bukan `response.ok`.
      const response = await apiClient.api.v1.me.notifications.$get({
        query: pageParam ? { cursor: pageParam } : {},
      })
      return response.json()
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.meta?.pagination
      return pagination?.mode === 'cursor' ? (pagination.next_cursor ?? undefined) : undefined
    },
  })

  const rows = (notifications.data?.pages ?? []).flatMap((page) => page.data)
  const unreadCount = rows.filter((row) => row.read_at === null).length

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
  }

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.api.v1.me.notifications[':id'].read.$post({ param: { id } })
    },
    onSuccess: () => {
      setError(null)
      refresh()
    },
    onError: (mutationError: Error) =>
      setError(displayErrorMessage(mutationError, 'Notifikasi gagal ditandai. Coba lagi.')),
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiClient.api.v1.me.notifications['read-all'].$post()
    },
    onSuccess: () => {
      setError(null)
      refresh()
    },
    onError: (mutationError: Error) =>
      setError(displayErrorMessage(mutationError, 'Notifikasi gagal ditandai. Coba lagi.')),
  })

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? (
            <span className="font-semibold text-foreground">{unreadCount} belum dibaca</span>
          ) : (
            'Semua notifikasi sudah dibaca'
          )}
        </p>
        {unreadCount > 0 ? (
          <Button
            size="sm"
            variant="outline"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {markAllRead.isPending ? 'Menandai…' : 'Tandai semua dibaca'}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">{error}</p>
      ) : null}

      {notifications.isPending ? (
        <div className="grid gap-3">
          <NotificationSkeleton />
          <NotificationSkeleton />
        </div>
      ) : null}

      {notifications.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="font-semibold text-foreground">Notifikasi gagal dimuat.</p>
          <p className="mt-1 text-muted-foreground">Periksa koneksi lalu coba lagi.</p>
          <Button className="mt-4" variant="outline" onClick={() => void notifications.refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!notifications.isPending && !notifications.isError && rows.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          description="Pengingat jadwal main, status pembayaran, dan kabar akun akan muncul di sini."
          actionHref="/lapangan"
          actionLabel="Lihat lapangan"
        />
      ) : null}

      <ul className="grid gap-3">
        {rows.map((notification) => {
          const copy = notificationCopy(notification.template_code)
          const href = notificationHref(notification.related_type, notification.related_id)
          const isUnread = notification.read_at === null

          return (
            <li key={notification.id}>
              <Card
                className={cn(
                  'flex items-start gap-4 p-4 sm:p-5',
                  isUnread ? 'border-primary/40 bg-primary/5' : null,
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    isUnread ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary',
                  )}
                  aria-hidden
                >
                  <BellRing className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-bold text-foreground">{copy.title}</p>
                    {isUnread ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-primary-foreground">
                        Baru
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{copy.body}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateWita(notification.created_at)} ·{' '}
                    {formatTimeWita(notification.created_at)} WITA
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {href ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={href}>
                          Lihat detail
                          <ChevronRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    ) : null}
                    {isUnread ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate(notification.id)}
                      >
                        Tandai dibaca
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>

      {notifications.hasNextPage ? (
        <Button
          className="justify-self-center"
          variant="outline"
          disabled={notifications.isFetchingNextPage}
          onClick={() => void notifications.fetchNextPage()}
        >
          {notifications.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      ) : null}
    </section>
  )
}
