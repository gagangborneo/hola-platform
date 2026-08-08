import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { type Court, mediaUrl } from '../../lib/server-api.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { Card, CardContent, CardFooter } from '../ui/card.tsx'

interface CourtCardProps {
  court: Court
  photoKey: string | null
}

export function CourtCard({ court, photoKey }: CourtCardProps): ReactNode {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted">
        {photoKey ? (
          <Image
            src={mediaUrl(photoKey)}
            alt={`Lapangan ${court.name}`}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        ) : null}
        <Badge
          className="absolute left-3 top-3"
          variant={court.is_indoor ? 'default' : 'secondary'}
        >
          {court.is_indoor ? 'Indoor' : 'Outdoor'}
        </Badge>
      </div>
      <CardContent className="pt-5">
        <h3 className="font-display text-xl font-bold text-foreground">{court.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {court.code}
          {court.surface ? ` · ${court.surface.replace(/_/g, ' ')}` : ''}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {court.slot_duration_minutes} menit per slot · {court.min_slots_per_booking}–
          {court.max_slots_per_booking} slot per booking
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/lapangan/${court.code}`}>Lihat ketersediaan</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
