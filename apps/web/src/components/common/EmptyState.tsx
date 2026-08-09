import { Button } from '@hola/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps): ReactNode {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <p className="font-display text-xl font-bold text-foreground">{title}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-6">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
