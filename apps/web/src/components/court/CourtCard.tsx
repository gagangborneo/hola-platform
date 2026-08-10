import { Badge, Button, Card, CardContent, CardFooter } from '@hola/ui'
import { Clock, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { surfaceLabel } from '../../lib/court-facilities.ts'
import { demoCourtPhotos } from '../../lib/court-photos.ts'
import { type Court, mediaUrl } from '../../lib/server-api.ts'

interface CourtCardProps {
  court: Court
  photoKey: string | null
}

export function CourtCard({ court, photoKey }: CourtCardProps): ReactNode {
  // Foto asli menang; `demoCourtPhotos` cuma menjaga kartu tidak tampil sebagai
  // kotak abu-abu kosong selama admin belum mengunggah foto lapangan.
  const photo = photoKey ? mediaUrl(photoKey) : demoCourtPhotos(court.code)[0]

  return (
    <Card className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className="relative aspect-4/3 bg-muted">
        {photo ? (
          <Image
            src={photo}
            alt={`Lapangan ${court.name}`}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/50 to-transparent"
        />
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
          {court.surface ? ` · ${surfaceLabel(court.surface)}` : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} className="text-primary" aria-hidden />
            {court.slot_duration_minutes} menit / slot
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} className="text-primary" aria-hidden />
            {court.min_slots_per_booking}–{court.max_slots_per_booking} slot per booking
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/lapangan/${encodeURIComponent(court.code)}`}>Lihat ketersediaan</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
