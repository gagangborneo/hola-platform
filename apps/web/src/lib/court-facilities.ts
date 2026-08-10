import {
  Armchair,
  CalendarRange,
  Car,
  Clock,
  Coffee,
  HeartPulse,
  Layers,
  Lightbulb,
  Lock,
  type LucideIcon,
  ShowerHead,
  Sun,
  Users,
  Volleyball,
  Warehouse,
  Wifi,
} from 'lucide-react'

export interface CourtFacility {
  id: string
  label: string
  /** Satu baris penjelas di bawah label; boleh kosong kalau labelnya sudah cukup. */
  detail: string | null
  icon: LucideIcon
}

/**
 * `surface` disimpan sebagai teks bebas oleh admin (`courts.surface`), jadi peta
 * ini hanya memperindah nilai yang sudah dikenal. Nilai di luar daftar tidak
 * dibuang — pemanggil menampilkan versi tanpa garis bawahnya apa adanya, karena
 * menyembunyikan permukaan yang benar-benar terisi lebih buruk daripada
 * menampilkannya dengan huruf apa adanya.
 */
const SURFACE_LABEL: Record<string, string> = {
  artificial_grass: 'Rumput sintetis',
  synthetic_grass: 'Rumput sintetis',
  vinyl: 'Vinyl',
  acrylic: 'Akrilik',
  concrete: 'Beton',
  parquet: 'Parket kayu',
  rubber: 'Karet',
  sand: 'Pasir',
}

export function surfaceLabel(surface: string): string {
  const known = SURFACE_LABEL[surface.toLowerCase()]
  if (known) return known
  // Huruf besar hanya di awal — bukan kelas `capitalize` di komponen, yang juga
  // akan mengubah label lain seperti "60 menit / slot" jadi "60 Menit / Slot".
  const humanized = surface.replace(/_/g, ' ')
  return humanized.charAt(0).toUpperCase() + humanized.slice(1)
}

interface CourtSpecInput {
  is_indoor: boolean
  surface: string | null
  slot_duration_minutes: number
  min_slots_per_booking: number
  max_slots_per_booking: number
  max_players: number | null
}

/**
 * Spesifikasi lapangan — SELURUHNYA dari data court yang sungguhan
 * (`GET /courts/:id`). Berbeda dengan `VENUE_FACILITIES` di bawah, isi daftar
 * ini boleh dipercaya customer.
 */
export function courtSpecs(court: CourtSpecInput): CourtFacility[] {
  const specs: CourtFacility[] = [
    {
      id: 'area',
      label: court.is_indoor ? 'Lapangan indoor' : 'Lapangan outdoor',
      detail: court.is_indoor
        ? 'Beratap, main tetap jalan saat hujan'
        : 'Terbuka, sirkulasi udara alami',
      icon: court.is_indoor ? Warehouse : Sun,
    },
  ]

  if (court.surface) {
    specs.push({
      id: 'surface',
      label: surfaceLabel(court.surface),
      detail: 'Permukaan lapangan',
      icon: Layers,
    })
  }

  specs.push({
    id: 'slot-duration',
    label: `${court.slot_duration_minutes} menit / slot`,
    detail: 'Durasi satu sesi main',
    icon: Clock,
  })

  specs.push({
    id: 'slot-range',
    label: `${court.min_slots_per_booking}–${court.max_slots_per_booking} slot`,
    detail: 'Batas pemesanan per booking',
    icon: CalendarRange,
  })

  if (court.max_players !== null) {
    specs.push({
      id: 'players',
      label: `Hingga ${court.max_players} pemain`,
      detail: 'Kapasitas per sesi',
      icon: Users,
    })
  }

  return specs
}

/**
 * FASILITAS DEMO — belum ada sumber datanya di API.
 *
 * Tidak ada kolom fasilitas di `courts` maupun `venues`, jadi daftar ini
 * ditulis tangan supaya halaman detail bisa dinilai secara visual. Sama seperti
 * `demo-events.ts`: begitu API menyediakan fasilitas per venue, ganti
 * pemanggilnya dengan data sungguhan lalu hapus konstanta ini — jangan biarkan
 * daftar ini tayang ke customer sungguhan sebagai janji layanan.
 */
export const VENUE_FACILITIES: CourtFacility[] = [
  { id: 'parkir', label: 'Parkir luas', detail: 'Mobil & motor, gratis', icon: Car },
  { id: 'ganti', label: 'Ruang ganti', detail: 'Lengkap dengan shower', icon: ShowerHead },
  { id: 'loker', label: 'Loker', detail: 'Penyimpanan barang berkunci', icon: Lock },
  { id: 'kafe', label: 'Kafe & lounge', detail: 'Minuman dingin dan camilan', icon: Coffee },
  { id: 'wifi', label: 'WiFi gratis', detail: 'Untuk pemain dan penonton', icon: Wifi },
  { id: 'lampu', label: 'Pencahayaan LED', detail: 'Terang merata sampai malam', icon: Lightbulb },
  { id: 'tribun', label: 'Tribun penonton', detail: 'Area duduk di tepi lapangan', icon: Armchair },
  { id: 'sewa', label: 'Sewa alat', detail: 'Raket, bola, dan handuk', icon: Volleyball },
  { id: 'p3k', label: 'P3K & staf siaga', detail: 'Selama jam operasional', icon: HeartPulse },
]
