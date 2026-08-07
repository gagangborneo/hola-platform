import { useState } from "react";
import {
  MapPin,
  Clock,
  Users,
  Star,
  ChevronRight,
  ArrowLeft,
  Check,
  Calendar,
  Shield,
  Zap,
  Menu,
  X,
  Phone,
  Mail,
  Instagram,
  Twitter,
  Wifi,
  Car,
  Coffee,
  ShowerHead,
  Wind,
  Lock,
  Trophy,
  BookOpen,
  Activity,
  Target,
  Bell,
  Gift,
  TrendingUp,
  PlayCircle,
  Smartphone,
} from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import logoFull from "@/imports/logo-hola-full.png";
import logoIcon from "@/imports/icon-logo-hola.png";

type Page =
  | "landing"
  | "courts"
  | "courtDetail"
  | "booking"
  | "payment"
  | "confirmation"
  | "info";

interface Court {
  id: number;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  type: "Indoor" | "Outdoor";
  surface: string;
  capacity: number;
  amenities: string[];
  image: string;
  images: string[];
  available: boolean;
  tags: string[];
  description: string;
}

const COURTS: Court[] = [
  {
    id: 1,
    name: "HOLA Arena Court A",
    location: "Klandasan, Balikpapan Selatan",
    price: 120000,
    rating: 4.9,
    reviews: 128,
    type: "Indoor",
    surface: "Artificial Grass",
    capacity: 4,
    amenities: [
      "AC",
      "Locker",
      "Shower",
      "Parking",
      "Cafeteria",
    ],
    image:
      "https://images.unsplash.com/photo-1709587824751-dd30420f5cf3?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1709587824751-dd30420f5cf3?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1658491830143-72808ca237e3?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1709587823868-735f9375ae74?w=800&h=500&fit=crop&auto=format",
    ],
    available: true,
    tags: ["Popular", "Indoor"],
    description:
      "Lapangan premium indoor dengan fasilitas lengkap. Permukaan artificial grass berkualitas tinggi, AC sentral, dan pencahayaan LED profesional untuk pengalaman bermain terbaik.",
  },
  {
    id: 2,
    name: "HOLA Arena Court B",
    location: "Klandasan, Balikpapan Selatan",
    price: 120000,
    rating: 4.8,
    reviews: 96,
    type: "Indoor",
    surface: "Artificial Grass",
    capacity: 4,
    amenities: ["AC", "Locker", "Shower", "Parking"],
    image:
      "https://images.unsplash.com/photo-1709587823868-735f9375ae74?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1709587823868-735f9375ae74?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1709587824751-dd30420f5cf3?w=800&h=500&fit=crop&auto=format",
    ],
    available: true,
    tags: ["Indoor"],
    description:
      "Lapangan indoor dengan standar internasional. Dilengkapi fasilitas loker dan shower untuk kenyamanan pemain setelah bermain.",
  },
  {
    id: 3,
    name: "HOLA Outdoor Court",
    location: "Gunung Bahagia, Balikpapan Selatan",
    price: 85000,
    rating: 4.7,
    reviews: 74,
    type: "Outdoor",
    surface: "Panoramic Glass",
    capacity: 4,
    amenities: ["Parking", "Cafeteria", "WiFi"],
    image:
      "https://images.unsplash.com/photo-1709587825135-80b00570c355?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1709587825135-80b00570c355?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1689942963385-f5bd03f3b270?w=800&h=500&fit=crop&auto=format",
    ],
    available: true,
    tags: ["Outdoor", "View"],
    description:
      "Lapangan outdoor rooftop dengan pemandangan kota Balikpapan yang spektakuler. Dinding kaca panoramik memberikan pengalaman bermain yang unik dan berkesan.",
  },
  {
    id: 4,
    name: "HOLA Premium Court",
    location: "Sepinggan, Balikpapan Selatan",
    price: 175000,
    rating: 5.0,
    reviews: 52,
    type: "Indoor",
    surface: "Artificial Grass Pro",
    capacity: 4,
    amenities: [
      "AC",
      "Locker",
      "Shower",
      "Parking",
      "Cafeteria",
      "WiFi",
    ],
    image:
      "https://images.unsplash.com/photo-1689942963385-f5bd03f3b270?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1689942963385-f5bd03f3b270?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1658491830143-72808ca237e3?w=800&h=500&fit=crop&auto=format",
    ],
    available: false,
    tags: ["Premium", "New"],
    description:
      "Lapangan premium dengan standar WPT (World Padel Tour). Fasilitas VIP lengkap termasuk ruang ganti privat, minuman gratis, dan penitipan raket.",
  },
  {
    id: 5,
    name: "HOLA Sport Hall 1",
    location: "Rapak, Balikpapan Utara",
    price: 100000,
    rating: 4.6,
    reviews: 89,
    type: "Indoor",
    surface: "Artificial Grass",
    capacity: 4,
    amenities: ["AC", "Parking", "Cafeteria"],
    image:
      "https://images.unsplash.com/photo-1658491830143-72808ca237e3?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1658491830143-72808ca237e3?w=800&h=500&fit=crop&auto=format",
    ],
    available: true,
    tags: ["Indoor"],
    description:
      "Lapangan indoor di pusat kota Balikpapan yang strategis dan mudah dijangkau. Cocok untuk sesi latihan maupun permainan kompetitif.",
  },
  {
    id: 6,
    name: "HOLA Rooftop Court",
    location: "Manggar, Balikpapan Timur",
    price: 95000,
    rating: 4.8,
    reviews: 61,
    type: "Outdoor",
    surface: "Synthetic Turf",
    capacity: 4,
    amenities: ["Parking", "Cafeteria", "WiFi", "Shower"],
    image:
      "https://images.unsplash.com/photo-1709587825415-814c2d7cfce7?w=800&h=500&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1709587825415-814c2d7cfce7?w=800&h=500&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1709587825135-80b00570c355?w=800&h=500&fit=crop&auto=format",
    ],
    available: true,
    tags: ["Outdoor", "Popular"],
    description:
      "Lapangan rooftop dengan suasana pantai yang segar. Bermain padel sambil menikmati angin laut dan pemandangan sunset yang menakjubkan.",
  },
];

const TIME_SLOTS = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];

const BOOKED_SLOTS: Record<string, string[]> = {
  "2026-08-03": ["09:00", "10:00", "14:00", "18:00", "19:00"],
  "2026-08-04": ["08:00", "12:00", "13:00", "20:00"],
  "2026-08-05": ["07:00", "11:00", "16:00", "17:00", "21:00"],
};

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function amenityIcon(a: string) {
  const map: Record<string, JSX.Element> = {
    AC: <Wind size={14} />,
    Locker: <Lock size={14} />,
    Shower: <ShowerHead size={14} />,
    Parking: <Car size={14} />,
    Cafeteria: <Coffee size={14} />,
    WiFi: <Wifi size={14} />,
  };
  return map[a] ?? <Check size={14} />;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav({
  page,
  onNavigate,
}: {
  page: Page;
  onNavigate: (p: Page) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center"
        >
          <ImageWithFallback
            src={logoFull}
            alt="HOLA! Padel"
            className="h-9 w-auto object-contain"
          />
        </button>
        <div className="hidden md:flex items-center gap-8 text-sm font-['DM_Sans'] font-semibold">
          <button
            onClick={() => onNavigate("landing")}
            className={`transition-colors ${page === "landing" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            Beranda
          </button>
          <button
            onClick={() => onNavigate("courts")}
            className={`transition-colors ${page === "courts" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            Lapangan
          </button>
          <button
            onClick={() => onNavigate("info" as Page)}
            className={`transition-colors ${page === ("info" as Page) ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
          >
            Informasi
          </button>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button className="text-sm font-semibold text-primary font-['DM_Sans'] px-4 py-2 rounded-lg border border-primary hover:bg-secondary transition-colors">
            Masuk
          </button>
          <button
            onClick={() => onNavigate("courts")}
            className="text-sm font-semibold text-accent-foreground font-['DM_Sans'] px-4 py-2 rounded-lg bg-gradient-to-r from-[#aaff00] to-[#39d353] hover:brightness-105 transition-all"
          >
            Pesan Sekarang
          </button>
        </div>
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <X size={22} className="text-primary" />
          ) : (
            <Menu size={22} className="text-primary" />
          )}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-border px-4 py-4 flex flex-col gap-3 font-['DM_Sans']">
          <button
            onClick={() => {
              onNavigate("landing");
              setMenuOpen(false);
            }}
            className="text-left text-sm font-semibold text-primary py-2"
          >
            Beranda
          </button>
          <button
            onClick={() => {
              onNavigate("courts");
              setMenuOpen(false);
            }}
            className="text-left text-sm font-semibold text-muted-foreground py-2"
          >
            Lapangan
          </button>
          <button
            onClick={() => { onNavigate("info" as Page); setMenuOpen(false); }}
            className="text-left text-sm font-semibold text-muted-foreground py-2"
          >
            Informasi
          </button>
          <button
            onClick={() => onNavigate("courts")}
            className="mt-2 w-full text-sm font-semibold text-accent-foreground px-4 py-3 rounded-lg bg-gradient-to-r from-[#aaff00] to-[#39d353]"
          >
            Pesan Sekarang
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function Landing({
  onNavigate,
}: {
  onNavigate: (p: Page, data?: unknown) => void;
}) {
  return (
    <div className="font-['DM_Sans']">
      {/* Hero */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden bg-primary">
        <div
          className="absolute inset-0 opacity-30 bg-blue-900"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1709587824751-dd30420f5cf3?w=1400&h=900&fit=crop&auto=format)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-bold text-accent tracking-widest uppercase">
                Booking Online #1 di Balikpapan
              </span>
            </div>
            <div className="mb-5"></div>
            <h1 className="font-['Fredoka'] font-semibold text-5xl md:text-7xl text-white leading-tight mb-6">
              Main Padel
              <br />
              <span className="text-accent">Kapan Saja</span>
            </h1>
            <p className="text-blue-200 text-lg leading-relaxed mb-8 max-w-md">
              Temukan dan pesan lapangan padel terbaik di
              Balikpapan dengan mudah. 6 lapangan premium,
              booking instan, dan harga terjangkau.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate("courts")}
                className="flex items-center gap-2 bg-gradient-to-r from-[#aaff00] to-[#39d353] text-accent-foreground font-bold px-8 py-4 rounded-xl text-base hover:brightness-110 transition-all shadow-lg shadow-green-400/30"
              >
                Pesan Lapangan <ChevronRight size={18} />
              </button>
              <button className="flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-xl text-base hover:bg-white/10 transition-all">
                Lihat Jadwal
              </button>
            </div>
            <div className="mt-10 flex gap-8">
              {[
                ["6+", "Lapangan"],
                ["2,000+", "Booking/Bulan"],
                ["4.9★", "Rating"],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-['Fredoka'] font-semibold text-3xl text-accent">
                    {n}
                  </p>
                  <p className="text-blue-200 text-xs uppercase tracking-wider">
                    {l}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            <div className="rounded-2xl overflow-hidden aspect-[3/4] bg-blue-900 row-span-2">
              <img
                src="https://images.unsplash.com/photo-1709587824751-dd30420f5cf3?w=400&h=600&fit=crop&auto=format"
                alt="Lapangan padel indoor"
                className="w-full h-full object-cover opacity-90"
              />
            </div>
            <div className="rounded-2xl overflow-hidden aspect-square bg-blue-900">
              <img
                src="https://images.unsplash.com/photo-1658491830143-72808ca237e3?w=400&h=400&fit=crop&auto=format"
                alt="Padel court surface"
                className="w-full h-full object-cover opacity-90"
              />
            </div>
            <div className="rounded-2xl overflow-hidden aspect-square bg-blue-900">
              <img
                src="https://images.unsplash.com/photo-1709587825135-80b00570c355?w=400&h=400&fit=crop&auto=format"
                alt="Padel court outdoor"
                className="w-full h-full object-cover opacity-90"
              />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Quick Search */}
      <section className="max-w-5xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-primary rounded-2xl shadow-xl shadow-primary/30 p-4 grid md:grid-cols-4 gap-3 items-end">
          {[
            {
              label: "Cabang Olahraga",
              placeholder: "Padel",
              icon: (
                <Users size={16} className="text-white/70" />
              ),
            },
            {
              label: "Tanggal",
              placeholder: "Hari ini",
              icon: (
                <Calendar size={16} className="text-white/70" />
              ),
            },
            {
              label: "Jam",
              placeholder: "07:00 - 20:00",
              icon: (
                <Clock size={16} className="text-white/70" />
              ),
            },
          ].map((f) => (
            <div
              key={f.label}
              className="flex flex-col gap-1.5"
            >
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">
                {f.label}
              </label>
              <div className="flex items-center gap-2 bg-white/15 hover:bg-white/20 transition-colors rounded-xl px-3 py-2.5 cursor-pointer">
                {f.icon}
                <span className="text-sm text-white font-medium">
                  {f.placeholder}
                </span>
              </div>
            </div>
          ))}
          <button
            onClick={() => onNavigate("courts")}
            className="bg-gradient-to-r from-[#aaff00] to-[#39d353] text-accent-foreground font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md shadow-green-400/40"
          >
            Cari Lapangan <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">
            Kenapa HOLA?
          </p>
          <h2 className="font-['Fredoka'] font-bold text-5xl text-foreground">
            LAYANAN TERBAIK{" "}
            <span className="text-primary">UNTUKMU</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <Zap size={28} className="text-[#1565c0]" />
              ),
              title: "Booking Instan",
              desc: "Pilih lapangan, pilih waktu, langsung bayar. Konfirmasi diterima dalam hitungan detik.",
            },
            {
              icon: (
                <Shield size={28} className="text-[#1565c0]" />
              ),
              title: "Pembayaran Aman",
              desc: "Transaksi dilindungi enkripsi SSL. Tersedia transfer bank, e-wallet, dan QRIS.",
            },
            {
              icon: (
                <Calendar
                  size={28}
                  className="text-[#1565c0]"
                />
              ),
              title: "Jadwal Fleksibel",
              desc: "Buka dari jam 06:00 hingga 23:00. Reschedule gratis hingga 24 jam sebelum bermain.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-card rounded-2xl p-8 border border-border hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center mb-5">
                {f.icon}
              </div>
              <h3 className="font-['Fredoka'] font-bold text-2xl mb-3 text-foreground">
                {f.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Courts Preview */}
      <section className="bg-primary/5 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">
                Tersedia Sekarang
              </p>
              <h2 className="font-['Fredoka'] font-bold text-5xl text-foreground">
                LAPANGAN{" "}
                <span className="text-primary">PILIHAN</span>
              </h2>
            </div>
            <button
              onClick={() => onNavigate("courts")}
              className="hidden md:flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Lihat Semua <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {COURTS.slice(0, 3).map((c) => (
              <CourtCard
                key={c.id}
                court={c}
                onSelect={() => onNavigate("courtDetail", c)}
              />
            ))}
          </div>
          <div className="mt-8 text-center md:hidden">
            <button
              onClick={() => onNavigate("courts")}
              className="text-sm font-bold text-primary border border-primary rounded-xl px-6 py-3"
            >
              Lihat Semua Lapangan
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">
            Cara Kerja
          </p>
          <h2 className="font-['Fredoka'] font-bold text-5xl text-foreground">
            BOOKING DALAM{" "}
            <span className="text-primary">3 LANGKAH</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-primary/20 via-accent to-primary/20" />
          {[
            {
              step: "01",
              title: "Pilih Lapangan",
              desc: "Browse lapangan berdasarkan lokasi, tipe, dan harga yang sesuai kebutuhan kamu.",
            },
            {
              step: "02",
              title: "Pilih Waktu",
              desc: "Tentukan tanggal dan jam sesi bermain. Slot tersedia ditampilkan secara real-time.",
            },
            {
              step: "03",
              title: "Bayar & Main!",
              desc: "Selesaikan pembayaran online dan terima konfirmasi booking via email dan WhatsApp.",
            },
          ].map((s) => (
            <div key={s.step} className="text-center relative">
              <div className="w-16 h-16 rounded-full bg-primary text-white font-['Fredoka'] font-semibold text-2xl flex items-center justify-center mx-auto mb-5 ring-4 ring-accent/50">
                {s.step}
              </div>
              <h3 className="font-['Fredoka'] font-bold text-2xl mb-3">
                {s.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-primary py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-accent uppercase tracking-widest mb-3">
              Ulasan Pemain
            </p>
            <h2 className="font-['Fredoka'] font-bold text-5xl text-white">
              APA KATA MEREKA
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Rafi Ananda",
                handle: "@rafi_padel",
                avatar: "RA",
                text: "Booking-nya super gampang! 2 menit langsung dapat slot. Lapangannya bagus banget, bersih dan terawat.",
                stars: 5,
              },
              {
                name: "Siti Maharani",
                handle: "@sitipadel",
                avatar: "SM",
                text: "HOLA jadi app wajib buat komunitas padel kami. Fitur reschedule-nya sangat membantu kalau ada perubahan jadwal mendadak.",
                stars: 5,
              },
              {
                name: "Budi Santoso",
                handle: "@budi_sport",
                avatar: "BS",
                text: "Harga transparan, tidak ada biaya tersembunyi. Customer service juga responsif. Highly recommended!",
                stars: 5,
              },
            ].map((t) => (
              <div
                key={t.name}
                className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map(
                    (_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className="text-accent fill-accent"
                      />
                    ),
                  )}
                </div>
                <p className="text-blue-100 text-sm leading-relaxed mb-5">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent text-accent-foreground font-bold text-xs flex items-center justify-center">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">
                      {t.name}
                    </p>
                    <p className="text-blue-300 text-xs">
                      {t.handle}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App Download */}
      <section className="bg-primary overflow-hidden relative py-24">
        {/* decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-full px-4 py-1.5 mb-5">
              <Smartphone size={14} className="text-accent" />
              <span className="text-xs font-bold text-accent tracking-widest uppercase">HOLA! App — Segera Hadir</span>
            </div>
            <h2 className="font-['Fredoka'] font-bold text-5xl md:text-6xl text-white leading-tight mb-4">
              Lebih dari Sekedar<br />
              <span className="text-accent">Booking Lapangan</span>
            </h2>
            <p className="text-blue-200 max-w-xl mx-auto leading-relaxed">
              Kelola olahraga harianmu, pelajari teknik baru, bersaing dengan teman, dan raih reward — semua dalam satu aplikasi.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — phone mockup */}
            <div className="relative flex justify-center">
              {/* Outer glow ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-72 h-72 rounded-full bg-gradient-to-br from-accent/20 to-primary blur-2xl" />
              </div>
              {/* Phone frame */}
              <div className="relative w-64 z-10">
                <div className="bg-[#0a1f5c] rounded-[2.5rem] border-4 border-white/20 shadow-2xl overflow-hidden" style={{ aspectRatio: "9/19" }}>
                  {/* Status bar */}
                  <div className="bg-[#0a1f5c] px-5 pt-3 pb-1 flex items-center justify-between">
                    <span className="text-white/60 text-[10px] font-bold">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-1.5 bg-white/60 rounded-sm" />
                      <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                    </div>
                  </div>
                  {/* App header */}
                  <div className="px-4 pb-2 flex items-center justify-between">
                    <ImageWithFallback src={logoFull} alt="HOLA!" className="h-5 w-auto object-contain brightness-0 invert" />
                    <Bell size={14} className="text-white/60" />
                  </div>
                  {/* Hero card inside phone */}
                  <div className="mx-3 rounded-2xl overflow-hidden relative mb-3" style={{ height: "100px" }}>
                    <img
                      src="https://images.unsplash.com/photo-1709587824751-dd30420f5cf3?w=400&h=200&fit=crop&auto=format"
                      alt="lapangan" className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-3">
                      <div>
                        <p className="text-white text-[9px] font-bold">Court A — Klandasan</p>
                        <p className="text-accent text-[8px]">Rp 120.000/jam · Tersedia</p>
                      </div>
                    </div>
                  </div>
                  {/* XP bar */}
                  <div className="mx-3 bg-white/10 rounded-xl p-2.5 mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1">
                        <Trophy size={10} className="text-accent" />
                        <span className="text-white text-[9px] font-bold">Level 12 — Padel Pro</span>
                      </div>
                      <span className="text-accent text-[8px] font-bold">2,340 XP</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full w-[68%] bg-gradient-to-r from-[#aaff00] to-[#39d353] rounded-full" />
                    </div>
                  </div>
                  {/* Quick actions */}
                  <div className="mx-3 grid grid-cols-4 gap-1.5 mb-3">
                    {[
                      { icon: <Calendar size={12} className="text-white" />, label: "Booking" },
                      { icon: <PlayCircle size={12} className="text-white" />, label: "Tutorial" },
                      { icon: <Activity size={12} className="text-white" />, label: "Stats" },
                      { icon: <Gift size={12} className="text-white" />, label: "Reward" },
                    ].map((a) => (
                      <div key={a.label} className="bg-white/10 rounded-xl p-2 flex flex-col items-center gap-1">
                        {a.icon}
                        <span className="text-white/70 text-[7px]">{a.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Leaderboard snippet */}
                  <div className="mx-3 bg-white/10 rounded-xl p-2.5">
                    <p className="text-white/60 text-[8px] font-bold uppercase tracking-wider mb-1.5">Top Pemain Minggu Ini</p>
                    {[
                      { rank: "🥇", name: "Rafi A.", pts: "520 pts" },
                      { rank: "🥈", name: "Siti M.", pts: "480 pts" },
                      { rank: "🥉", name: "Kamu", pts: "410 pts" },
                    ].map((r) => (
                      <div key={r.name} className="flex items-center justify-between py-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px]">{r.rank}</span>
                          <span className={`text-[8px] font-semibold ${r.name === "Kamu" ? "text-accent" : "text-white/80"}`}>{r.name}</span>
                        </div>
                        <span className="text-[8px] text-white/50">{r.pts}</span>
                      </div>
                    ))}
                  </div>
                  {/* Bottom nav bar */}
                  <div className="mt-3 mx-2 mb-2 bg-white/10 rounded-2xl px-4 py-2 flex justify-around">
                    {[Calendar, Activity, Trophy, Users].map((Icon, i) => (
                      <div key={i} className={`flex flex-col items-center gap-0.5 ${i === 0 ? "opacity-100" : "opacity-40"}`}>
                        <Icon size={12} className={i === 0 ? "text-accent" : "text-white"} />
                        {i === 0 && <div className="w-1 h-1 rounded-full bg-accent" />}
                      </div>
                    ))}
                  </div>
                </div>
                {/* floating badges */}
                <div className="absolute -right-10 top-12 bg-white rounded-xl shadow-xl px-3 py-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#aaff00] to-[#39d353] flex items-center justify-center">
                    <Trophy size={12} className="text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-foreground leading-none">+150 XP</p>
                    <p className="text-[8px] text-muted-foreground">Match selesai!</p>
                  </div>
                </div>
                <div className="absolute -left-12 bottom-24 bg-white rounded-xl shadow-xl px-3 py-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                    <Bell size={11} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-foreground leading-none">Booking OK!</p>
                    <p className="text-[8px] text-muted-foreground">Court A · 08:00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — feature list */}
            <div className="flex flex-col gap-5">
              {[
                {
                  icon: <Calendar size={22} className="text-primary" />,
                  bg: "bg-gradient-to-br from-[#aaff00] to-[#39d353]",
                  title: "Booking Instan",
                  desc: "Pesan lapangan padel, futsal, atau badminton dalam 30 detik. Pilih slot, bayar, selesai.",
                  badge: null,
                },
                {
                  icon: <PlayCircle size={22} className="text-white" />,
                  bg: "bg-primary",
                  title: "Tutorial & Coaching",
                  desc: "Ratusan video teknik dari pelatih bersertifikat. Dari forehand dasar hingga smash tingkat lanjut.",
                  badge: "Baru",
                },
                {
                  icon: <Activity size={22} className="text-white" />,
                  bg: "bg-[#2563eb]",
                  title: "Manajemen Performa",
                  desc: "Lacak statistik match, kalori terbakar, jam bermain, dan perkembangan skill tiap minggu.",
                  badge: null,
                },
                {
                  icon: <Trophy size={22} className="text-primary" />,
                  bg: "bg-gradient-to-br from-[#aaff00] to-[#39d353]",
                  title: "Gamification & Reward",
                  desc: "Kumpulkan XP, naiki leaderboard, buka badge eksklusif, dan tukar poin jadi diskon booking.",
                  badge: "Hot",
                },
                {
                  icon: <Users size={22} className="text-white" />,
                  bg: "bg-[#1e3a8a]",
                  title: "Komunitas & Turnamen",
                  desc: "Bergabung dengan komunitas padel Balikpapan, ikuti turnamen, dan cari sparring partner.",
                  badge: null,
                },
                {
                  icon: <Target size={22} className="text-white" />,
                  bg: "bg-[#0f3460]",
                  title: "Program Latihan",
                  desc: "Jadwal latihan terstruktur mingguan disesuaikan dengan level dan target bermainmu.",
                  badge: null,
                },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-4 group">
                  <div className={`w-11 h-11 rounded-2xl ${f.bg} flex items-center justify-center shrink-0 shadow-lg`}>
                    {f.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-['Fredoka'] font-bold text-lg text-white">{f.title}</h3>
                      {f.badge && (
                        <span className="text-[10px] font-bold bg-accent text-accent-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {f.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-blue-200 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}

              {/* Download buttons */}
              <div className="pt-4 flex flex-wrap gap-3">
                <button className="flex items-center gap-3 bg-white text-foreground font-semibold px-5 py-3 rounded-xl hover:bg-white/90 transition-all shadow-md">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.42.07 2.41.74 3.24.8 1.23-.24 2.41-.93 3.72-.84 1.57.13 2.74.78 3.51 1.97-3.23 1.94-2.68 5.88.4 7.05-.65 1.63-1.37 3.24-2.87 3.9zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-foreground/60 leading-none">Download di</p>
                    <p className="text-sm font-bold leading-tight">App Store</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 bg-white text-foreground font-semibold px-5 py-3 rounded-xl hover:bg-white/90 transition-all shadow-md">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" aria-hidden="true">
                    <path d="M3.18 23.76c.3.17.65.19.97.07l12.45-7.2-2.67-2.67-10.75 9.8zM.29 1.33A1.03 1.03 0 0 0 0 2.06v19.88c0 .28.1.55.29.73l.09.08 11.13-11.13v-.26L.38 1.25l-.09.08zM20.93 10.6l-2.83-1.64-2.99 2.99 2.99 2.99 2.85-1.65c.81-.47.81-1.24-.02-1.69zM3.18.24L15.63 7.44l-2.67 2.67L.38.31 3.18.24z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] text-foreground/60 leading-none">Tersedia di</p>
                    <p className="text-sm font-bold leading-tight">Google Play</p>
                  </div>
                </button>
              </div>
              <p className="text-blue-300/60 text-xs flex items-center gap-1.5">
                <TrendingUp size={12} /> Sudah diunduh 5.000+ pemain di Balikpapan
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-[#aaff00] to-[#39d353] rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-['Fredoka'] font-bold text-4xl md:text-5xl text-foreground mb-2">
              SIAP MAIN PADEL?
            </h2>
            <p className="text-foreground/70 font-medium">
              Daftarkan diri dan dapatkan diskon 20% untuk
              booking pertamamu.
            </p>
          </div>
          <button
            onClick={() => onNavigate("courts")}
            className="shrink-0 bg-primary text-white font-bold px-10 py-4 rounded-xl text-base hover:brightness-110 transition-all flex items-center gap-2 shadow-lg"
          >
            Booking Sekarang <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <ImageWithFallback
              src={logoFull}
              alt="HOLA! Padel"
              className="h-8 w-auto object-contain mb-3"
            />
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-4">
              Platform booking lapangan padel terpercaya di
              Balikpapan. Main kapan saja, di mana saja.
            </p>
            <div className="flex gap-3">
              {[
                <Instagram size={16} />,
                <Twitter size={16} />,
                <Phone size={16} />,
                <Mail size={16} />,
              ].map((icon, i) => (
                <button
                  key={i}
                  className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-sm text-foreground mb-4">
              Navigasi
            </p>
            {[
              "Beranda",
              "Lapangan",
              "Jadwal",
              "Promo",
              "Blog",
            ].map((l) => (
              <p
                key={l}
                className="text-muted-foreground text-sm py-1 hover:text-primary cursor-pointer transition-colors"
              >
                {l}
              </p>
            ))}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground mb-4">
              Kontak
            </p>
            <p className="text-muted-foreground text-sm py-1">
              +62 21 1234 5678
            </p>
            <p className="text-muted-foreground text-sm py-1">
              hello@holapadel.id
            </p>
            <p className="text-muted-foreground text-sm py-1 leading-relaxed">
              Jl. Jend. Sudirman No. 8,
              <br />
              Balikpapan Selatan 76114
            </p>
          </div>
        </div>
        <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground font-['DM_Sans']">
          © 2026 HOLA Padel. Hak cipta dilindungi.
        </div>
      </footer>
    </div>
  );
}

// ─── COURT CARD ───────────────────────────────────────────────────────────────
function CourtCard({
  court,
  onSelect,
}: {
  court: Court;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
    >
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        <img
          src={court.image}
          alt={court.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          {court.tags.map((t) => (
            <span
              key={t}
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${t === "Popular" || t === "New" ? "bg-accent text-accent-foreground" : "bg-primary/80 text-white"}`}
            >
              {t}
            </span>
          ))}
        </div>
        {!court.available && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-white/90 text-foreground font-bold text-sm px-4 py-2 rounded-full">
              Penuh Hari Ini
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-['Fredoka'] font-bold text-xl text-foreground leading-tight">
            {court.name}
          </h3>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Star
              size={13}
              className="text-accent fill-accent"
            />
            <span className="text-xs font-bold text-foreground">
              {court.rating}
            </span>
            <span className="text-xs text-muted-foreground">
              ({court.reviews})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-3">
          <MapPin size={12} /> <span>{court.location}</span>
        </div>
        <div className="flex gap-2 mb-4">
          <span className="text-xs px-2 py-1 rounded-lg bg-secondary text-secondary-foreground font-medium">
            {court.type}
          </span>
          <span className="text-xs px-2 py-1 rounded-lg bg-secondary text-secondary-foreground font-medium">
            {court.surface}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-['Fredoka'] font-bold text-xl text-primary">
              {formatRupiah(court.price)}
            </span>
            <span className="text-muted-foreground text-xs">
              {" "}
              /jam
            </span>
          </div>
          <button className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:brightness-110 transition-all">
            Pilih
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── COURTS LIST ──────────────────────────────────────────────────────────────
function CourtsPage({
  onNavigate,
}: {
  onNavigate: (p: Page, data?: unknown) => void;
}) {
  const [filter, setFilter] = useState<
    "All" | "Indoor" | "Outdoor"
  >("All");
  const [sort, setSort] = useState<"price" | "rating">(
    "rating",
  );
  const filtered = COURTS.filter(
    (c) => filter === "All" || c.type === filter,
  ).sort((a, b) =>
    sort === "price" ? a.price - b.price : b.rating - a.rating,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 font-['DM_Sans']">
      <div className="mb-8">
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        <h1 className="font-['Fredoka'] font-bold text-5xl text-foreground">
          SEMUA <span className="text-primary">LAPANGAN</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          {filtered.length} lapangan tersedia di Balikpapan
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex gap-2">
          {(["All", "Indoor", "Outdoor"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm font-bold px-4 py-2 rounded-lg border transition-all ${filter === f ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"}`}
            >
              {f === "All" ? "Semua" : f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Urutkan:
          </span>
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "price" | "rating")
            }
            className="text-sm font-semibold text-foreground bg-card border border-border rounded-lg px-3 py-2 outline-none"
          >
            <option value="rating">Rating Tertinggi</option>
            <option value="price">Harga Terendah</option>
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((c) => (
          <CourtCard
            key={c.id}
            court={c}
            onSelect={() => onNavigate("courtDetail", c)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── COURT DETAIL ─────────────────────────────────────────────────────────────
function CourtDetailPage({
  court,
  onNavigate,
}: {
  court: Court;
  onNavigate: (p: Page, data?: unknown) => void;
}) {
  const [activeImg, setActiveImg] = useState(0);
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 font-['DM_Sans']">
      <button
        onClick={() => onNavigate("courts")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Kembali ke Daftar
      </button>
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden aspect-[16/9] bg-muted mb-3">
            <img
              src={court.images[activeImg]}
              alt={court.name}
              className="w-full h-full object-cover"
            />
          </div>
          {court.images.length > 1 && (
            <div className="flex gap-3">
              {court.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`rounded-xl overflow-hidden w-20 h-14 flex-shrink-0 border-2 transition-all ${i === activeImg ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="mt-8">
            <h1 className="font-['Fredoka'] font-bold text-4xl text-foreground mb-1">
              {court.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MapPin size={14} /> {court.location}
              </div>
              <div className="flex items-center gap-1">
                <Star
                  size={14}
                  className="text-accent fill-accent"
                />
                <span className="text-sm font-bold">
                  {court.rating}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({court.reviews} ulasan)
                </span>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${court.type === "Indoor" ? "bg-primary/10 text-primary" : "bg-green-100 text-green-700"}`}
              >
                {court.type}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-8">
              {court.description}
            </p>
            <div className="mb-8">
              <h3 className="font-['Fredoka'] font-bold text-xl mb-4">
                Fasilitas
              </h3>
              <div className="flex flex-wrap gap-3">
                {court.amenities.map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-2 bg-secondary text-secondary-foreground text-sm font-medium px-4 py-2 rounded-lg"
                  >
                    {amenityIcon(a)} {a}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-['Fredoka'] font-bold text-xl mb-4">
                Info Lapangan
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Tipe", value: court.type },
                  { label: "Permukaan", value: court.surface },
                  {
                    label: "Kapasitas",
                    value: `${court.capacity} pemain`,
                  },
                ].map((i) => (
                  <div
                    key={i.label}
                    className="bg-secondary rounded-xl p-4"
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      {i.label}
                    </p>
                    <p className="font-bold text-foreground">
                      {i.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Right - Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-card rounded-2xl border border-border p-6 shadow-lg">
            <div className="mb-4">
              <span className="font-['Fredoka'] font-bold text-3xl text-primary">
                {formatRupiah(court.price)}
              </span>
              <span className="text-muted-foreground text-sm">
                {" "}
                /jam
              </span>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div
                className={`w-2 h-2 rounded-full ${court.available ? "bg-green-500" : "bg-red-500"}`}
              />
              <span
                className={`text-sm font-medium ${court.available ? "text-green-600" : "text-red-600"}`}
              >
                {court.available
                  ? "Tersedia Hari Ini"
                  : "Penuh Hari Ini"}
              </span>
            </div>
            {court.available ? (
              <button
                onClick={() => onNavigate("booking", court)}
                className="w-full bg-primary text-white font-bold py-4 rounded-xl text-base hover:brightness-110 transition-all flex items-center justify-center gap-2 mb-3"
              >
                Pesan Lapangan Ini <ChevronRight size={18} />
              </button>
            ) : (
              <button className="w-full bg-muted text-muted-foreground font-bold py-4 rounded-xl text-base cursor-not-allowed mb-3">
                Tidak Tersedia
              </button>
            )}
            <button className="w-full border border-border text-foreground font-semibold py-3 rounded-xl text-sm hover:bg-muted transition-colors">
              Lihat Jadwal Lengkap
            </button>
            <div className="mt-5 pt-5 border-t border-border flex flex-col gap-2">
              {[
                "Konfirmasi instan via WhatsApp",
                "Reschedule gratis 24 jam sebelumnya",
                "Pembayaran 100% aman",
              ].map((t) => (
                <div
                  key={t}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Check
                    size={13}
                    className="text-primary shrink-0"
                  />{" "}
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING ──────────────────────────────────────────────────────────────────
function BookingPage({
  court,
  onNavigate,
}: {
  court: Court;
  onNavigate: (p: Page, data?: unknown) => void;
}) {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [selectedSlot, setSelectedSlot] = useState<
    string | null
  >(null);
  const [duration, setDuration] = useState(1);
  const [players, setPlayers] = useState(4);

  const dateKey = selectedDate.toISOString().slice(0, 10);
  const booked = BOOKED_SLOTS[dateKey] ?? [];

  const days = [
    "Min",
    "Sen",
    "Sel",
    "Rab",
    "Kam",
    "Jum",
    "Sab",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  const total = court.price * duration;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 font-['DM_Sans']">
      <button
        onClick={() => onNavigate("courtDetail", court)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Kembali
      </button>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {[
          { n: 1, l: "Pilih Waktu" },
          { n: 2, l: "Pembayaran" },
          { n: 3, l: "Konfirmasi" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
            >
              {s.n}
            </div>
            <span
              className={`text-sm font-medium hidden sm:block ${i === 0 ? "text-primary" : "text-muted-foreground"}`}
            >
              {s.l}
            </span>
            {i < 2 && (
              <ChevronRight
                size={16}
                className="text-muted-foreground mx-1"
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-7">
          {/* Date */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-['Fredoka'] font-bold text-xl mb-5 flex items-center gap-2">
              <Calendar size={18} className="text-primary" />{" "}
              Pilih Tanggal
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {dates.map((d) => {
                const active =
                  d.toDateString() ===
                  selectedDate.toDateString();
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => {
                      setSelectedDate(d);
                      setSelectedSlot(null);
                    }}
                    className={`shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-all min-w-[56px] ${active ? "bg-primary border-primary text-white" : "border-border hover:border-primary text-foreground"}`}
                  >
                    <span className="text-xs font-medium opacity-70">
                      {days[d.getDay()]}
                    </span>
                    <span className="font-['Fredoka'] font-bold text-xl leading-tight">
                      {d.getDate()}
                    </span>
                    <span className="text-xs opacity-70">
                      {months[d.getMonth()]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-['Fredoka'] font-bold text-xl mb-5 flex items-center gap-2">
              <Clock size={18} className="text-primary" /> Pilih
              Jam
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {TIME_SLOTS.map((slot) => {
                const isBooked = booked.includes(slot);
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    disabled={isBooked}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                      isBooked
                        ? "bg-muted border-muted text-muted-foreground cursor-not-allowed line-through"
                        : isSelected
                          ? "bg-primary border-primary text-white"
                          : "border-border hover:border-primary text-foreground"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4">
              {[
                [
                  "bg-primary border-primary text-white",
                  "Dipilih",
                ],
                [
                  "bg-muted border-muted text-muted-foreground",
                  "Tidak tersedia",
                ],
                ["border-border text-foreground", "Tersedia"],
              ].map(([cls, lbl]) => (
                <div
                  key={lbl}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 ${cls}`}
                  />
                  {lbl}
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-['Fredoka'] font-bold text-xl mb-5">
              Opsi Booking
            </h3>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Durasi Bermain
                </label>
                <div className="flex gap-2">
                  {[1, 1.5, 2].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${duration === d ? "bg-primary border-primary text-white" : "border-border hover:border-primary text-foreground"}`}
                    >
                      {d === 1.5 ? "1.5j" : `${d}j`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Jumlah Pemain
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setPlayers(Math.max(2, players - 1))
                    }
                    className="w-9 h-9 rounded-lg border-2 border-border font-bold text-foreground hover:border-primary transition-all flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="font-['Fredoka'] font-bold text-xl w-8 text-center">
                    {players}
                  </span>
                  <button
                    onClick={() =>
                      setPlayers(Math.min(4, players + 1))
                    }
                    className="w-9 h-9 rounded-lg border-2 border-border font-bold text-foreground hover:border-primary transition-all flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-card rounded-2xl border border-border p-6 shadow-lg">
            <h3 className="font-['Fredoka'] font-bold text-xl mb-5">
              Ringkasan Booking
            </h3>
            <div className="rounded-xl overflow-hidden aspect-video bg-muted mb-4">
              <img
                src={court.image}
                alt={court.name}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="font-bold text-foreground mb-1">
              {court.name}
            </p>
            <p className="text-muted-foreground text-xs mb-4 flex items-center gap-1">
              <MapPin size={11} />
              {court.location}
            </p>
            <div className="flex flex-col gap-2.5 mb-5">
              {[
                {
                  label: "Tanggal",
                  value: `${days[selectedDate.getDay()]}, ${selectedDate.getDate()} ${months[selectedDate.getMonth()]} 2026`,
                },
                {
                  label: "Jam Mulai",
                  value: selectedSlot ?? "—",
                },
                { label: "Durasi", value: `${duration} jam` },
                { label: "Pemain", value: `${players} orang` },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="font-semibold text-foreground">
                    {row.value}
                  </span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-bold text-foreground">
                  Total
                </span>
                <span className="font-['Fredoka'] font-bold text-xl text-primary">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>
            <button
              disabled={!selectedSlot}
              onClick={() =>
                selectedSlot &&
                onNavigate("payment", {
                  court,
                  date: selectedDate,
                  slot: selectedSlot,
                  duration,
                  players,
                  total,
                })
              }
              className={`w-full font-bold py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2 ${selectedSlot ? "bg-gradient-to-r from-[#aaff00] to-[#39d353] text-accent-foreground hover:brightness-105 shadow-md shadow-green-400/30" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
            >
              Lanjut ke Pembayaran <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT ──────────────────────────────────────────────────────────────────
interface BookingData {
  court: Court;
  date: Date;
  slot: string;
  duration: number;
  players: number;
  total: number;
}

function PaymentPage({
  booking,
  onNavigate,
}: {
  booking: BookingData;
  onNavigate: (p: Page, data?: unknown) => void;
}) {
  const [method, setMethod] = useState<
    "transfer" | "qris" | "ewallet"
  >("transfer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const days = [
    "Min",
    "Sen",
    "Sel",
    "Rab",
    "Kam",
    "Jum",
    "Sab",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agt",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  function handlePay() {
    if (!name || !phone || !email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onNavigate("confirmation", booking);
    }, 1800);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 font-['DM_Sans']">
      <button
        onClick={() => onNavigate("booking", booking.court)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Kembali
      </button>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {[
          { n: 1, l: "Pilih Waktu" },
          { n: 2, l: "Pembayaran" },
          { n: 3, l: "Konfirmasi" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-primary/20 text-primary" : i === 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
            >
              {i === 0 ? <Check size={14} /> : s.n}
            </div>
            <span
              className={`text-sm font-medium hidden sm:block ${i === 1 ? "text-primary" : "text-muted-foreground"}`}
            >
              {s.l}
            </span>
            {i < 2 && (
              <ChevronRight
                size={16}
                className="text-muted-foreground mx-1"
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Contact */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-['Fredoka'] font-bold text-xl mb-5">
              Data Pemesan
            </h3>
            <div className="flex flex-col gap-4">
              {[
                {
                  label: "Nama Lengkap",
                  value: name,
                  set: setName,
                  placeholder: "Masukkan nama lengkap",
                  type: "text",
                },
                {
                  label: "No. WhatsApp",
                  value: phone,
                  set: setPhone,
                  placeholder: "08xxxxxxxxxx",
                  type: "tel",
                },
                {
                  label: "Alamat Email",
                  value: email,
                  set: setEmail,
                  placeholder: "email@contoh.com",
                  type: "email",
                },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full bg-input-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-['Fredoka'] font-bold text-xl mb-5">
              Metode Pembayaran
            </h3>
            <div className="flex flex-col gap-3">
              {[
                {
                  id: "transfer" as const,
                  label: "Transfer Bank",
                  desc: "BCA, Mandiri, BNI, BRI",
                  badge: "Populer",
                },
                {
                  id: "qris" as const,
                  label: "QRIS",
                  desc: "Scan QR untuk bayar instan",
                  badge: null,
                },
                {
                  id: "ewallet" as const,
                  label: "E-Wallet",
                  desc: "GoPay, OVO, DANA, ShopeePay",
                  badge: null,
                },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${method === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${method === m.id ? "border-primary" : "border-muted-foreground"}`}
                  >
                    {method === m.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {m.label}
                      </span>
                      {m.badge && (
                        <span className="text-xs font-bold bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {m.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {method === "transfer" && (
              <div className="mt-4 p-4 rounded-xl bg-secondary border border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Nomor Rekening Tujuan
                </p>
                <p className="font-bold text-foreground">
                  BCA — 7890 1234 56
                </p>
                <p className="text-sm text-muted-foreground">
                  a/n PT HOLA Padel Indonesia
                </p>
              </div>
            )}
            {method === "qris" && (
              <div className="mt-4 p-4 rounded-xl bg-secondary border border-border flex items-center gap-4">
                <div className="w-24 h-24 bg-white rounded-xl border border-border flex items-center justify-center">
                  <div className="grid grid-cols-5 gap-0.5">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3.5 h-3.5 ${Math.random() > 0.5 ? "bg-foreground" : "bg-white"}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">
                    Scan QR ini
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Berlaku 15 menit
                  </p>
                  <p className="text-xs font-bold text-primary mt-2">
                    {formatRupiah(booking.total)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-card rounded-2xl border border-border p-6 shadow-lg">
            <h3 className="font-['Fredoka'] font-bold text-xl mb-4">
              Ringkasan
            </h3>
            <div className="bg-secondary rounded-xl p-4 mb-4">
              <p className="font-bold text-sm text-foreground">
                {booking.court.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {booking.court.location}
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                {[
                  {
                    l: "Tanggal",
                    v: `${days[booking.date.getDay()]}, ${booking.date.getDate()} ${months[booking.date.getMonth()]}`,
                  },
                  {
                    l: "Jam",
                    v: `${booking.slot} (${booking.duration} jam)`,
                  },
                  {
                    l: "Pemain",
                    v: `${booking.players} orang`,
                  },
                ].map((r) => (
                  <div
                    key={r.l}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {r.l}
                    </span>
                    <span className="font-semibold text-foreground">
                      {r.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center mb-5 pt-1">
              <span className="font-bold text-foreground">
                Total Bayar
              </span>
              <span className="font-['Fredoka'] font-bold text-2xl text-primary">
                {formatRupiah(booking.total)}
              </span>
            </div>
            <button
              onClick={handlePay}
              disabled={!name || !phone || !email || loading}
              className={`w-full font-bold py-4 rounded-xl text-base transition-all flex items-center justify-center gap-2 ${name && phone && email ? "bg-primary text-white hover:brightness-110 shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Memproses...
                </span>
              ) : (
                <>
                  <Shield size={16} /> Bayar Sekarang
                </>
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Transaksi aman & terenkripsi SSL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRMATION ─────────────────────────────────────────────────────────────
function ConfirmationPage({
  booking,
  onNavigate,
}: {
  booking: BookingData;
  onNavigate: (p: Page) => void;
}) {
  const days = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const bookingCode = `HOLA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return (
    <div className="max-w-xl mx-auto px-4 py-16 font-['DM_Sans'] text-center">
      <div className="mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#aaff00] to-[#39d353] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-400/30 overflow-hidden p-2">
          <ImageWithFallback
            src={logoIcon}
            alt="HOLA!"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="font-['Fredoka'] font-bold text-5xl text-foreground mb-2">
          BOOKING BERHASIL!
        </h1>
        <p className="text-muted-foreground">
          Konfirmasi telah dikirim ke WhatsApp dan email kamu.
        </p>
      </div>

      <div className="bg-card rounded-2xl border-2 border-primary/20 p-7 mb-6 text-left">
        <div className="flex items-center justify-between mb-5">
          <ImageWithFallback
            src={logoFull}
            alt="HOLA! Padel"
            className="h-8 w-auto object-contain"
          />
          <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">
            CONFIRMED
          </span>
        </div>
        <div className="rounded-xl overflow-hidden aspect-video bg-muted mb-5">
          <img
            src={booking.court.image}
            alt={booking.court.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="mb-4">
          <p className="font-bold text-lg text-foreground">
            {booking.court.name}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin size={12} />
            {booking.court.location}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            {
              label: "Tanggal",
              value: `${days[booking.date.getDay()]}, ${booking.date.getDate()} ${months[booking.date.getMonth()]} 2026`,
            },
            { label: "Jam Mulai", value: booking.slot },
            {
              label: "Durasi",
              value: `${booking.duration} jam`,
            },
            {
              label: "Pemain",
              value: `${booking.players} orang`,
            },
          ].map((r) => (
            <div
              key={r.label}
              className="bg-secondary rounded-xl p-3"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                {r.label}
              </p>
              <p className="font-bold text-foreground text-sm">
                {r.value}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-border pt-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-muted-foreground text-sm">
              Total Pembayaran
            </span>
            <span className="font-['Fredoka'] font-bold text-2xl text-primary">
              {formatRupiah(booking.total)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">
              Kode Booking
            </span>
            <span className="font-mono font-bold text-foreground bg-accent/30 px-3 py-1 rounded-lg text-sm tracking-widest">
              {bookingCode}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 rounded-xl p-4 mb-8 text-sm text-muted-foreground text-left flex gap-3">
        <Zap
          size={16}
          className="text-primary shrink-0 mt-0.5"
        />
        <span>
          Tunjukkan kode booking di atas kepada petugas HOLA
          sebelum sesi dimulai. Hadir minimal 10 menit sebelum
          jadwal.
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onNavigate("courts")}
          className="flex-1 border-2 border-primary text-primary font-bold py-4 rounded-xl hover:bg-primary hover:text-white transition-all"
        >
          Pesan Lapangan Lagi
        </button>
        <button
          onClick={() => onNavigate("landing")}
          className="flex-1 bg-gradient-to-r from-[#aaff00] to-[#39d353] text-accent-foreground font-bold py-4 rounded-xl hover:brightness-105 transition-all"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}

// ─── INFO PAGE ────────────────────────────────────────────────────────────────
const EVENTS = [
  {
    id: 1,
    title: "HOLA! Open Padel Championship 2026",
    category: "Turnamen",
    date: "23–25 Agustus 2026",
    location: "HOLA Arena, Klandasan",
    image: "https://images.unsplash.com/photo-1709587824751-dd30420f5cf3?w=700&h=400&fit=crop&auto=format",
    tag: "Daftar Sekarang",
    tagColor: "bg-gradient-to-r from-[#aaff00] to-[#39d353] text-accent-foreground",
    prize: "Rp 15.000.000",
    desc: "Turnamen padel terbesar di Kalimantan Timur. Terbuka untuk kategori umum putra, putri, dan campuran. Hadiah total Rp 15 juta.",
    featured: true,
  },
  {
    id: 2,
    title: "Klinik Padel Pemula — Bersama Coach Reza",
    category: "Workshop",
    date: "10 Agustus 2026",
    location: "HOLA Arena Court B",
    image: "https://images.unsplash.com/photo-1658491830143-72808ca237e3?w=700&h=400&fit=crop&auto=format",
    tag: "Pendaftaran Dibuka",
    tagColor: "bg-primary text-white",
    prize: null,
    desc: "Sesi klinik 3 jam untuk pemula. Materi: grip, forehand, backhand, dan servis dasar. Kapasitas terbatas 12 peserta.",
    featured: false,
  },
  {
    id: 3,
    title: "Balikpapan Futsal League — Seri 3",
    category: "Liga",
    date: "Setiap Sabtu, Agustus 2026",
    location: "HOLA Sport Hall, Rapak",
    image: "https://images.unsplash.com/photo-1709587825135-80b00570c355?w=700&h=400&fit=crop&auto=format",
    tag: "Sedang Berlangsung",
    tagColor: "bg-green-500 text-white",
    prize: "Rp 5.000.000",
    desc: "Liga futsal mingguan untuk kategori amateur dan semi-pro. Sistem round-robin, 8 tim per seri. Daftar tim sekarang.",
    featured: false,
  },
  {
    id: 4,
    title: "Fun Badminton — Keluarga & Komunitas",
    category: "Komunitas",
    date: "18 Agustus 2026",
    location: "HOLA Arena, Klandasan",
    image: "https://images.unsplash.com/photo-1709587823868-735f9375ae74?w=700&h=400&fit=crop&auto=format",
    tag: "Gratis",
    tagColor: "bg-amber-400 text-amber-900",
    prize: null,
    desc: "Event bulutangkis santai untuk keluarga dan komunitas. Tidak diperlukan level khusus. Hadiah doorprize untuk semua peserta.",
    featured: false,
  },
  {
    id: 5,
    title: "Padel Doubles Ranking Series",
    category: "Turnamen",
    date: "6–7 September 2026",
    location: "HOLA Arena Court A & B",
    image: "https://images.unsplash.com/photo-1689942963385-f5bd03f3b270?w=700&h=400&fit=crop&auto=format",
    tag: "Segera",
    tagColor: "bg-blue-100 text-blue-700",
    prize: "Rp 8.000.000",
    desc: "Seri ranking ganda padel resmi HOLA. Poin masuk ke papan peringkat regional Kalimantan. Kategori: Open & Senior 40+.",
    featured: false,
  },
  {
    id: 6,
    title: "Coaching Clinic — Teknik Smash & Lob",
    category: "Workshop",
    date: "28 Agustus 2026",
    location: "HOLA Arena Court A",
    image: "https://images.unsplash.com/photo-1709587825415-814c2d7cfce7?w=700&h=400&fit=crop&auto=format",
    tag: "Pendaftaran Dibuka",
    tagColor: "bg-primary text-white",
    prize: null,
    desc: "Workshop teknik lanjutan bersama pelatih nasional. Fokus pada smash keras, lob defensif, dan posisi net play.",
    featured: false,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Turnamen: "bg-primary/10 text-primary",
  Workshop: "bg-purple-100 text-purple-700",
  Liga: "bg-green-100 text-green-700",
  Komunitas: "bg-amber-100 text-amber-700",
};

function InfoPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [activeFilter, setActiveFilter] = useState<string>("Semua");
  const filters = ["Semua", "Turnamen", "Workshop", "Liga", "Komunitas"];
  const featured = EVENTS.find((e) => e.featured)!;
  const filtered = EVENTS.filter(
    (e) => !e.featured && (activeFilter === "Semua" || e.category === activeFilter)
  );

  return (
    <div className="font-['DM_Sans']">
      {/* Page header */}
      <div className="bg-primary py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-1 text-sm text-blue-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <p className="text-xs font-bold text-accent uppercase tracking-widest mb-3">Event & Berita</p>
          <h1 className="font-['Fredoka'] font-bold text-5xl md:text-6xl text-white mb-3">
            Informasi Olahraga
          </h1>
          <p className="text-blue-200 max-w-xl">
            Turnamen, klinik coaching, liga mingguan, dan event komunitas olahraga di Balikpapan.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Featured event */}
        <div
          className="relative rounded-3xl overflow-hidden mb-12 cursor-pointer group"
          style={{ minHeight: 340 }}
        >
          <img
            src={featured.image}
            alt={featured.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/60 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end h-full p-8 md:p-10" style={{ minHeight: 340 }}>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur">
                ⭐ Featured
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${CATEGORY_COLORS[featured.category]}`}>
                {featured.category}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${featured.tagColor}`}>
                {featured.tag}
              </span>
            </div>
            <h2 className="font-['Fredoka'] font-bold text-3xl md:text-4xl text-white mb-2">
              {featured.title}
            </h2>
            <p className="text-blue-100 text-sm mb-4 max-w-xl">{featured.desc}</p>
            <div className="flex flex-wrap gap-5 text-sm text-blue-200">
              <span className="flex items-center gap-1.5"><Calendar size={14} />{featured.date}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} />{featured.location}</span>
              {featured.prize && (
                <span className="flex items-center gap-1.5">
                  <Trophy size={14} className="text-accent" />
                  <span className="text-accent font-bold">Hadiah {featured.prize}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-all ${
                activeFilter === f
                  ? "bg-primary text-white border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Event grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                <img
                  src={ev.image}
                  alt={ev.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[ev.category]}`}>
                    {ev.category}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ev.tagColor}`}>
                    {ev.tag}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-['Fredoka'] font-bold text-lg text-foreground leading-snug mb-2">
                  {ev.title}
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed mb-4 line-clamp-2">
                  {ev.desc}
                </p>
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1.5"><Calendar size={12} />{ev.date}</span>
                  <span className="flex items-center gap-1.5"><MapPin size={12} />{ev.location}</span>
                  {ev.prize && (
                    <span className="flex items-center gap-1.5">
                      <Trophy size={12} className="text-accent-foreground" />
                      <span className="font-bold text-foreground">Hadiah {ev.prize}</span>
                    </span>
                  )}
                </div>
                <button className="w-full border-2 border-primary text-primary text-sm font-bold py-2.5 rounded-xl hover:bg-primary hover:text-white transition-all">
                  Lihat Detail
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter strip */}
        <div className="mt-16 bg-primary rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div>
            <h3 className="font-['Fredoka'] font-bold text-2xl text-white mb-1">
              Jangan Lewatkan Event Berikutnya
            </h3>
            <p className="text-blue-200 text-sm">Daftarkan email untuk notifikasi event & promo terbaru HOLA.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="email"
              placeholder="emailkamu@gmail.com"
              className="flex-1 md:w-64 bg-white/15 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-blue-300 focus:outline-none focus:border-accent transition-colors"
            />
            <button className="bg-gradient-to-r from-[#aaff00] to-[#39d353] text-accent-foreground font-bold px-5 py-3 rounded-xl hover:brightness-110 transition-all shrink-0">
              Langganan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [selectedCourt, setSelectedCourt] = useState<Court>(
    COURTS[0],
  );
  const [bookingData, setBookingData] =
    useState<BookingData | null>(null);

  function navigate(p: Page, data?: unknown) {
    if (p === "courtDetail" || p === "booking") {
      const court = data as Court;
      setSelectedCourt(court);
    } else if (p === "payment") {
      setBookingData(data as BookingData);
    } else if (p === "confirmation") {
      setBookingData(data as BookingData);
    }
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const showNav = page !== "confirmation";

  return (
    <div className="min-h-screen bg-background">
      {showNav && (
        <Nav page={page} onNavigate={(p) => navigate(p)} />
      )}
      {page === "landing" && <Landing onNavigate={navigate} />}
      {page === "courts" && (
        <CourtsPage onNavigate={navigate} />
      )}
      {page === "courtDetail" && (
        <CourtDetailPage
          court={selectedCourt}
          onNavigate={navigate}
        />
      )}
      {page === "booking" && (
        <BookingPage
          court={selectedCourt}
          onNavigate={navigate}
        />
      )}
      {page === "payment" && bookingData && (
        <PaymentPage
          booking={bookingData}
          onNavigate={navigate}
        />
      )}
      {page === "confirmation" && bookingData && (
        <ConfirmationPage
          booking={bookingData}
          onNavigate={(p) => navigate(p)}
        />
      )}
      {page === "info" && <InfoPage onNavigate={(p) => navigate(p)} />}
    </div>
  );
}