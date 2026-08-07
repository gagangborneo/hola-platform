# Desain P1.K — `apps/web` (customer)

- **Tanggal:** 2026-08-08
- **Cakupan:** P1-71 … P1-80 ([tasks/PHASE-1.md](../../../tasks/PHASE-1.md))
- **Referensi visual:** `references/web` (export Figma Make, bukan aplikasi yang dijalankan)
- **Status:** disetujui, siap dibuat rencana implementasi

---

## 1. Titik berangkat

### 1.1 Kondisi `apps/web` sekarang

Next.js 16 (App Router) + React 19, TypeScript 7, dengan yang sudah jadi:

- Autentikasi lengkap: `/login`, `/daftar`, `/lupa-password`, `/reset-password`, `/verifikasi-email`
- `authStore` in-memory (S-5) dengan `restoreSession` single-flight
- `apiClient` typed dari `@hola/api-client` dengan refresh token single-flight
- TanStack Query, Sentry, security headers, `env.ts`
- Landing masih placeholder

Styling seluruhnya CSS polos di `src/styles/globals.css` (~200 baris, palet hijau `#087c63`). Tidak ada Tailwind, tidak ada design system.

### 1.2 Kondisi referensi

`references/web` adalah export Figma Make: Vite + Tailwind v4 + shadcn/ui (49 komponen) + `App.tsx` sepanjang 2.485 baris berisi 7 layar padel dengan data hardcoded. `guidelines/Guidelines.md` masih template kosong, jadi tidak ada aturan desain tertulis — yang bisa dipanen hanya bahasa visualnya.

Referensi diperlakukan sebagai **acuan**, bukan sumber yang disalin utuh.

---

## 2. Keputusan yang diambil

| # | Keputusan | Alasan |
|---|---|---|
| D-1 | Adopsi Tailwind v4 + subset shadcn ke `apps/web` saja | Tercepat untuk anggaran 9 jam; `apps/admin` (P1.L) butuh bahasa visual back-office yang berbeda, jadi `packages/ui` bersama belum terbayar sekarang |
| D-2 | 5 halaman auth ikut dipindah ke Tailwind | Mencegah dua bahasa visual berdampingan di jalur "Pesan → diminta login" |
| D-3 | Endpoint API yang kurang dibangun lebih dulu | Web dibangun di atas API sungguhan; menghindari utang integrasi yang baru meledak saat UAT (P1-97) |
| D-4 | Setiap langkah booking punya URL sendiri | Refresh/back/share bekerja; E-4 "lanjutkan checkout" jadi navigasi biasa; Snap redirect butuh URL tujuan |
| D-5 | Statistik & testimoni karangan dibuang | Landing produksi tidak boleh menyiarkan klaim palsu tentang bisnis nyata; sistem ulasan bukan cakupan Phase 1 |

---

## 3. Fondasi

### 3.1 Design system

Tailwind v4 lewat `@tailwindcss/postcss` (Next 16 tidak memakai plugin Vite seperti referensi).

Token disalin dari `references/web/src/styles/theme.css` ke `apps/web/src/styles/theme.css`:

- `--primary: #1565c0`, `--accent: #96f535`, `--background: #f4f8ff`, `--foreground: #0a1f5c`
- `--radius: 0.875rem`
- Blok `@theme inline` dipertahankan agar utilitas Tailwind (`bg-primary`, `text-accent`) menunjuk token yang sama

`globals.css` lama dihapus setelah 5 halaman auth dipindah. Blok `.dark` dari referensi **tidak** diikutkan: mode gelap bukan cakupan Phase 1, dan nilai `.dark` di referensi masih default shadcn abu-abu yang tidak cocok dengan palet biru. Deklarasi `@custom-variant dark (&:is(.dark *))` tetap dipertahankan agar kelas `dark:` bawaan komponen shadcn tetap terkompilasi tanpa error, meski tidak pernah aktif.

**Font.** `next/font/google` untuk Fredoka (heading) dan DM Sans (body). Referensi memakai `@import` ke `fonts.googleapis.com`; itu akan diblokir CSP yang sudah aktif (`font-src 'self' data:`). `next/font` menyelfhost saat build sehingga CSP tidak perlu dilonggarkan.

**Komponen shadcn yang disalin** (11 dari 49): `button`, `card`, `input`, `label`, `badge`, `dialog`, `sheet`, `accordion`, `checkbox`, `select`, `skeleton` — plus `sonner` untuk toast.

`calendar` dan `react-day-picker` **tidak** diambil. Horizon booking terbatas dan rentang availability maksimal 14 hari, jadi pemilih tanggal cukup berupa *date strip* horizontal — lebih baik di mobile dan menghemat dua dependensi.

**Dependensi baru:** `tailwindcss`, `@tailwindcss/postcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `@radix-ui/react-slot`, `@radix-ui/react-dialog`, `@radix-ui/react-label`, `@radix-ui/react-accordion`, `@radix-ui/react-checkbox`, `@radix-ui/react-select`.

### 3.2 Panen dari referensi visual

| Diambil | Diadaptasi | Dibuang |
|---|---|---|
| Palet, radius, tipografi, bentuk kartu, ritme spasi | Hero: tetap bergambar + badge aksen, teks jadi multi-olahraga | Statistik & testimoni karangan |
| Pola kartu lapangan, badge `Indoor`/`Outdoor` | Bagian "cara pesan" jadi 3 langkah sesuai alur asli | Bagian promosi aplikasi mobile (belum ada) |
| Gradien tombol aksi utama | Amenities dari data court sungguhan | Konstanta `COURTS`, gambar Unsplash |

Kartu lapangan referensi menampilkan `rating` dan jumlah ulasan. Kedua field itu tidak ada di model data dan tidak ada di Phase 1; diganti `rate_class` + "harga mulai dari".

Platform ini multi-olahraga dengan padel sebagai unggulan ([00-OVERVIEW § 1](../../00-OVERVIEW.md)), sedangkan referensi padel-only. Landing menampilkan daftar olahraga dari data, bukan menyebut padel sebagai satu-satunya produk.

### 3.3 Routing & rendering

```
Publik — Server Component, ISR revalidate 300 detik
  /                        landing; + app/sitemap.ts, app/opengraph-image.tsx
  /lapangan                daftar + filter olahraga
  /lapangan/[kode]         detail lapangan (grid ketersediaan = client)
  /info                    jam operasional, lokasi, kontak, kebijakan pembatalan

Terproteksi — Client Component + TanStack Query
  /checkout                quote, addon, kode promo
  /booking/[id]            countdown hold + tombol bayar
  /booking/[id]/status     polling pembayaran; target redirect Snap
  /akun/booking            mendatang & riwayat (cursor pagination)
  /akun/booking/[id]       detail, e-receipt, pembatalan

Auth — dipindah ke Tailwind, logika tidak disentuh
  /login /daftar /lupa-password /reset-password /verifikasi-email
```

Slug berbahasa Indonesia, mengikuti konvensi yang sudah dipakai halaman auth.

**Penjaga rute.** Access token hanya hidup di memori (S-5), jadi middleware server tidak bisa menilai sesi. Penjaga berupa komponen klien yang menunggu `authStore.isReady`, lalu mengalihkan ke `/login?next=…`. Pola ini meniru `RoleRouteGuard` di `apps/admin`.

**Fetch server-side.** `src/lib/server-api.ts` — fetch typed sederhana ke `API_BASE_URL_INTERNAL` (sudah ada di `.env.example`) untuk endpoint publik. `apiClient` yang ada tetap khusus browser karena membawa alur refresh token.

### 3.4 Prasyarat API

Empat perubahan read-only di `apps/api`, semuanya di atas repository yang sudah ada:

| # | Endpoint | Isi |
|---|---|---|
| API-1 | `GET /courts` | Publik. Filter `sport_id`, `status`, `is_indoor`. Urut `sort_order`, `code`. Sesuai [04-API-CONTRACT.md:615](../../04-API-CONTRACT.md) yang sudah menjanjikannya |
| API-2 | `GET /courts/{court_id}` | Publik. Detail + foto + jam operasional + `min_slots_per_booking` + `max_slots_per_booking` |
| API-3 | `GET /sports` | Publik. Sumber "daftar olahraga" di landing & filter. **Belum ada di kontrak** — ditambahkan ke `04-API-CONTRACT.md` sebagai bagian pekerjaan ini |
| API-4 | `GET /bookings/{id}` | Tambah `is_cancellable`, `refund_estimate_amount`, `policy_applied`. [06 C-8](../../06-MODULE-BOOKING.md) sudah mensyaratkannya, tetapi field itu kini hanya muncul di response `POST /bookings/{id}/cancel` |

Ditambah satu perubahan konfigurasi: `require_contiguous_slots` dimasukkan ke `PUBLIC_SETTINGS` di `public-config.service.ts` agar checkout bisa memvalidasi kontiguitas sebelum mengirim request (BR-B-09).

`max_slots_per_booking` **bukan** app setting melainkan kolom `courts` (BR-B-02, default 1..4, dihitung per court), jadi ia ikut di API-2 dan tidak butuh endpoint setting.

### 3.5 CSP untuk Snap

CSP sekarang tidak punya direktif `frame-src` sama sekali sehingga jatuh ke `default-src 'self'`. Popup Snap merender iframe dari domain Midtrans dan akan diblokir tanpa pesan yang jelas.

`createSecurityHeaders` diberi parameter origin Midtrans, lalu menambahkan domain tersebut ke `script-src`, `frame-src`, dan `connect-src`. 3DS bank terbuka di dalam iframe Snap dan ditangani Midtrans, sehingga tidak perlu didaftarkan satu per satu.

Header CSP dihasilkan `next.config.ts` saat build sehingga **tidak bisa** membaca `midtrans_is_production` dari `/config/public` yang baru tersedia saat runtime. Origin karena itu diturunkan dari variabel build baru `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` (ditambahkan ke `.env.example`), yang nilainya wajib sama dengan mode Midtrans di API — kalau berbeda, popup terblokir. `env.ts` memvalidasi variabel ini, dan halaman pembayaran memakai nilai yang sama untuk memilih URL `snap.js`, sehingga CSP dan skrip yang dimuat selalu sepasang. Hanya satu origin yang diizinkan per build; sandbox tidak ikut masuk ke CSP produksi.

`snap_redirect_url` sudah tersedia di response payment dan dipakai sebagai jalur cadangan bila `snap.js` gagal dimuat; pengalihan halaman penuh tidak membutuhkan `frame-src`.

---

## 4. Perilaku per layar

### 4.1 Landing, daftar & detail lapangan (P1-71, P1-72)

Landing memuat hero, daftar olahraga (API-3), lapangan unggulan (API-1), jam operasional, lokasi, kontak. Metadata SEO per halaman, `app/sitemap.ts`, dan `app/opengraph-image.tsx`.

Isi bagian "kenapa Hola" diambil dari fakta yang terverifikasi: jumlah lapangan, jam buka, olahraga tersedia, lokasi. Tidak ada rating, jumlah booking, atau testimoni sampai ada sistem yang menghasilkannya.

Foto lapangan dari `media.hola.id`; `next.config.ts` diberi `images.remotePatterns` untuk host tersebut.

### 4.2 Grid ketersediaan (P1-73)

Client component di `/lapangan/[kode]`. Date strip 14 hari dibatasi `booking_horizon_days` dari `/config/public`. Data dari `GET /courts/{id}/availability?date=…` lewat TanStack Query dengan `staleTime` 60 detik, sejalan dengan TTL cache Redis di server (BR-B-41).

Slot dirender sebagai tombol grid:

- **Tersedia** — dapat diklik, menampilkan `rate_class` dan `price_amount`
- **Tidak tersedia** — disabled dengan label alasan

Pemetaan `unavailable_reason` → label:

| `unavailable_reason` | Label |
|---|---|
| `booking`, `event`, `match` | "Sudah dipesan" |
| `maintenance` | "Perawatan" |
| `closed` | "Tutup" |
| `past` | "Sudah lewat" |
| `beyond_horizon` | "Belum dibuka" |

Tiga nilai pertama sengaja digabung: response ketersediaan tidak memuat identitas pemesan (aturan privasi [06 § 5.2](../../06-MODULE-BOOKING.md)), dan membedakan `booking` dari `event` tidak menambah nilai bagi customer.

`meta.warnings` yang memuat `BEYOND_BOOKING_HORIZON` (E-11) menandai seluruh hari sebagai "Belum dibuka untuk pemesanan" — bukan error, sesuai kontrak bahwa kalender UI tidak boleh pecah.

`meta.generated_at` tampil sebagai "Diperbarui HH:mm" dengan tombol segarkan. Tarik-untuk-menyegarkan diimplementasikan sebagai gestur sentuh di container grid tanpa pustaka tambahan, aktif hanya di viewport sentuh.

### 4.3 Checkout (P1-74)

Slot terpilih dibawa lewat query param agar `/checkout` tahan refresh.

Validasi klien sebelum mengirim:

- Satu `booking_date` saja (BR-B-01)
- Jumlah slot per court di dalam `min_slots_per_booking`..`max_slots_per_booking` (BR-B-02)
- Kontiguitas, hanya bila `require_contiguous_slots` bernilai true (BR-B-09)

Ringkasan harga dirender **persis** dari response `POST /bookings/quote`. Tidak ada perkalian, penjumlahan, atau pembulatan harga di klien — termasuk subtotal, pajak, dan diskon (BR-B-12). Setiap perubahan slot, addon, atau promo memicu quote ulang, bukan hitung ulang lokal.

Kode promo divalidasi lewat `POST /promos/validate` untuk umpan balik cepat, lalu quote ulang menghasilkan angka final yang mengikat. `cancellation_policy_text` tampil di halaman ini (BR-B-71).

### 4.4 Buat booking & countdown hold (P1-75)

`Idempotency-Key` UUID v7 dibuat sekali per percobaan checkout dan disimpan di `sessionStorage`; klik ganda atau refresh saat request in-flight tidak melahirkan dua booking. Kunci di-reset hanya ketika pilihan slot berubah.

Countdown dihitung `hold_expires_at − (Date.now() + offset)`, dengan `offset = server_time − waktu klien` diambil saat memuat `/config/public` (E-23). Jam klien yang meleset karena itu tidak membuat countdown berbohong. Durasi hold 10 menit (BR-B-33). Saat habis, halaman berpindah ke keadaan "hold berakhir" dengan tautan kembali ke ketersediaan; tidak ada polling tambahan.

Penanganan konflik:

| Kondisi | Perilaku |
|---|---|
| `409 SLOT_ALREADY_CLAIMED` (E-3) | Pesan "Slot baru saja diambil orang lain", invalidasi query ketersediaan, kembalikan ke grid pada tanggal yang sama |
| `409` karena BR-B-14 (3 booking `pending_payment`) | Arahkan ke `/akun/booking` yang menyorot booking yang perlu dibayar (E-20) |

### 4.5 Pembayaran (P1-76)

`POST /payments` menghasilkan `snap_token` dan `snap_redirect_url`. `snap.js` dimuat lewat `next/script` dari domain yang ditentukan `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` (§ 3.5) — variabel yang sama yang membentuk CSP, sehingga skrip yang dimuat selalu berada di dalam daftar izin. `midtrans_client_key` tetap diambil dari `/config/public`. Popup adalah jalur utama; `snap_redirect_url` adalah cadangan bila skrip gagal dimuat.

`/booking/[id]/status` melakukan polling `GET /payments/{id}` tiap 3 detik, berhenti pada status final atau setelah 5 menit. Setelah batas itu, halaman menawarkan pemeriksaan manual yang memanggil `POST /payments/{id}/sync`.

`meta.warnings` yang memuat `PROMO_QUOTA_EXHAUSTED` (E-10) atau `PRICE_CHANGED` (E-13) menghentikan alur dan meminta konfirmasi ulang: quote baru ditampilkan berdampingan dengan yang lama, dan pengguna menyetujui secara eksplisit sebelum lanjut. Tidak ada penyesuaian harga diam-diam.

### 4.6 Riwayat, e-receipt, pembatalan (P1-77, P1-78)

`/akun/booking` punya dua tab (mendatang / riwayat) dengan cursor pagination lewat `useInfiniteQuery`. Booking `pending_payment` yang `hold_expires_at`-nya masih hidup menampilkan "Lanjutkan pembayaran" menuju `/booking/[id]` (E-4); yang sudah lewat ditandai kedaluwarsa.

Detail booking membaca `is_cancellable`, `refund_estimate_amount`, dan `policy_applied` dari API-4. Dialog pembatalan menampilkan ketiganya **plus** `cancellation_policy_text` sebelum tombol konfirmasi aktif, dan `reason` wajib diisi (BR-B-71). Refund senilai Rp 0 ditampilkan eksplisit beserta kebijakan yang berlaku, bukan disembunyikan (BR-B-63).

E-receipt dari `GET /bookings/{id}/receipt`, dirender sebagai halaman siap cetak.

### 4.7 Keadaan tepi (P1-79)

`not-found.tsx` dan `error.tsx` per segmen, keadaan kosong bertema untuk daftar lapangan dan daftar booking, serta halaman `/offline`.

`401` sudah ditangani `api-client` lewat refresh single-flight. Lapisan web hanya menangani kegagalan akhirnya: bersihkan `authStore`, arahkan ke `/login?next=…`.

---

## 5. Test (P1-80)

`apps/web` sudah punya vitest tetapi belum punya setup React. Ditambahkan: `@vitejs/plugin-react`, `@testing-library/react`, `happy-dom`, dan `vitest.config.ts`.

Test yang sudah ada (`lib/auth.test.ts`, `lib/security-headers.test.ts`) berjalan di environment `node` dan harus tetap begitu. Karena itu `vitest.config.ts` memakai environment `node` sebagai default dan hanya mengalihkan berkas di bawah `src/components/**` ke `happy-dom`, bukan mengganti environment global.

Tiga sasaran wajib per BR-TT-16:

| Test | Yang dikunci |
|---|---|
| Grid ketersediaan | Pemetaan `unavailable_reason` → label; slot tidak tersedia tidak dapat diklik; `BEYOND_BOOKING_HORIZON` tidak melempar error |
| Countdown hold | Offset `server_time` diterapkan — jam klien meleset 5 menit tetap menghasilkan sisa waktu yang benar; transisi ke keadaan kedaluwarsa |
| Form checkout | Validasi kondisional: batas slot per court, satu `booking_date`, kontiguitas hanya saat setting aktif |

Ditambah regresi di `security-headers.test.ts` bahwa `frame-src` memuat origin Midtrans.

Endpoint baru di § 3.4 mengikuti pola test integrasi yang sudah dipakai modul lain di `apps/api`.

---

## 6. Urutan kerja

1. Prasyarat API (§ 3.4) + `require_contiguous_slots` ke config publik + CSP Midtrans (§ 3.5)
2. Fondasi Tailwind/shadcn/font + pemindahan 5 halaman auth
3. Landing + sitemap + OG image; daftar & detail lapangan
4. Grid ketersediaan → checkout → booking + hold → pembayaran
5. Akun, e-receipt, pembatalan
6. Keadaan tepi + test

Langkah 1 dan 2 saling bebas. Sisanya berurutan karena tiap layar memberi umpan ke layar berikutnya.

---

## 7. Di luar cakupan

- Mode gelap
- Reschedule oleh customer (utang teknis Phase 1, disebut di P1-100)
- Sistem ulasan/rating
- `packages/ui` bersama untuk web + admin
- Restyle `apps/admin` (cakupan P1.L)
- PWA/service worker; `/offline` adalah halaman biasa, bukan cache offline
