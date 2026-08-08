/**
 * DATA DEMO — bukan jadwal resmi.
 *
 * Halaman `/info` belum punya sumber data di API (tidak ada endpoint event
 * atau berita). Daftar di bawah hanya mengisi tampilan supaya halaman bisa
 * dinilai secara visual. Begitu endpoint tersedia, ganti pemanggilnya dengan
 * fetch ke API lalu hapus modul ini — jangan biarkan konten ini tayang ke
 * pengunjung sungguhan sebagai jadwal yang bisa dipercaya.
 */

export const EVENT_CATEGORIES = ['Turnamen', 'Workshop', 'Liga', 'Komunitas'] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export interface DemoEvent {
  id: string
  title: string
  category: EventCategory
  date: string
  location: string
  image: string
  tag: string
  /** Kelas Tailwind untuk pil status; ikut referensi desain. */
  tagClassName: string
  prize: string | null
  description: string
  featured: boolean
}

export const CATEGORY_CLASS: Record<EventCategory, string> = {
  // Pil kategori berdiri di atas foto, jadi latarnya solid — `bg-primary/10`
  // milik referensi nyaris tidak terbaca di sana.
  Turnamen: 'bg-white text-primary',
  Workshop: 'bg-purple-100 text-purple-700',
  Liga: 'bg-green-100 text-green-700',
  Komunitas: 'bg-amber-100 text-amber-700',
}

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: 'open-padel-championship',
    title: 'HOLA! Open Padel Championship',
    category: 'Turnamen',
    date: '23–25 Agustus',
    location: 'Hola Arena, Klandasan',
    image: '/images/events/turnamen-padel.jpg',
    tag: 'Pendaftaran dibuka',
    tagClassName: 'bg-linear-to-r from-[#aaff00] to-[#39d353] text-accent-foreground',
    prize: 'Rp 15.000.000',
    description:
      'Turnamen padel terbuka untuk kategori putra, putri, dan campuran. Sistem gugur ganda dengan babak penyisihan grup di hari pertama.',
    featured: true,
  },
  {
    id: 'klinik-padel-pemula',
    title: 'Klinik Padel Pemula',
    category: 'Workshop',
    date: '10 Agustus',
    location: 'Hola Arena Court B',
    image: '/images/events/klinik-padel.jpg',
    tag: 'Kuota terbatas',
    tagClassName: 'bg-primary text-primary-foreground',
    prize: null,
    description:
      'Sesi tiga jam untuk pemula: grip, forehand, backhand, dan servis dasar. Kapasitas 12 peserta per sesi.',
    featured: false,
  },
  {
    id: 'liga-futsal-seri-3',
    title: 'Balikpapan Futsal League — Seri 3',
    category: 'Liga',
    date: 'Setiap Sabtu, Agustus',
    location: 'Hola Sport Hall, Rapak',
    image: '/images/events/liga-futsal.jpg',
    tag: 'Sedang berlangsung',
    tagClassName: 'bg-green-500 text-white',
    prize: 'Rp 5.000.000',
    description:
      'Liga futsal mingguan untuk kategori amatir dan semi-pro. Sistem round-robin dengan delapan tim per seri.',
    featured: false,
  },
  {
    id: 'fun-badminton',
    title: 'Fun Badminton — Keluarga & Komunitas',
    category: 'Komunitas',
    date: '18 Agustus',
    location: 'Hola Arena, Klandasan',
    image: '/images/events/fun-badminton.jpg',
    tag: 'Gratis',
    tagClassName: 'bg-amber-400 text-amber-900',
    prize: null,
    description:
      'Bulutangkis santai untuk keluarga dan komunitas. Tanpa syarat level bermain, terbuka untuk semua usia.',
    featured: false,
  },
  {
    id: 'padel-ranking-series',
    title: 'Padel Doubles Ranking Series',
    category: 'Turnamen',
    date: '6–7 September',
    location: 'Hola Arena Court A & B',
    image: '/images/events/ranking-series.jpg',
    tag: 'Segera',
    tagClassName: 'bg-blue-100 text-blue-700',
    prize: 'Rp 8.000.000',
    description:
      'Seri ranking ganda dengan poin yang masuk ke papan peringkat regional. Kategori Open dan Senior 40+.',
    featured: false,
  },
  {
    id: 'coaching-clinic-smash',
    title: 'Coaching Clinic — Teknik Smash & Lob',
    category: 'Workshop',
    date: '28 Agustus',
    location: 'Hola Arena Court A',
    image: '/images/events/coaching-clinic.jpg',
    tag: 'Kuota terbatas',
    tagClassName: 'bg-primary text-primary-foreground',
    prize: null,
    description:
      'Workshop teknik lanjutan: smash keras, lob defensif, dan posisi net play untuk pemain menengah ke atas.',
    featured: false,
  },
]
