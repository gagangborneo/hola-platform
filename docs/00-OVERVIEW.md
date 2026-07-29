# 00 — OVERVIEW: Hola Sports Center Platform

> **Dokumen ini adalah titik masuk.** Jika kamu adalah AI coding assistant yang baru membuka
> repo ini tanpa memori sesi sebelumnya: **baca file ini sampai habis, lalu baca
> [01-ARCHITECTURE.md](01-ARCHITECTURE.md), [03-DATA-MODEL.md](03-DATA-MODEL.md), dan
> [16-CONVENTIONS.md](16-CONVENTIONS.md) sebelum menulis kode apa pun.**
>
> Semua keputusan arsitektur & infrastruktur di dokumen ini **sudah final**. Jangan
> mengusulkan penggantian stack. Jika sebuah keputusan belum diambil, ia ditandai
> `[BUTUH KEPUTUSAN CLIENT]` — jangan mengarang jawabannya, tanyakan atau pakai default
> yang tertulis.

---

## 1. Ringkasan Produk

**Hola** adalah platform manajemen gedung olahraga milik satu badan usaha di Balikpapan,
Indonesia. Gedung memiliki beberapa lapangan olahraga — **lapangan padel sebagai produk
unggulan** — plus beberapa **tenant cafe** yang menyewa ruang komersial di dalam gedung.

Platform menggabungkan tiga jenis sistem dalam satu produk:

| Jenis | Isi |
|---|---|
| **Customer-facing** | Landing page, booking lapangan online + pembayaran, pendaftaran event & turnamen, leaderboard, aplikasi mobile |
| **Back-office** | Dashboard admin/staff: jadwal, harga, promo, tenant cafe, event, turnamen, CRM, HRIS ringan, jurnal keuangan |
| **Otomasi** | Background job: pelepasan hold slot, rekonsiliasi pembayaran, tagihan tenant bulanan, notifikasi, snapshot leaderboard |

### Sumber pendapatan (revenue streams)

1. **Booking lapangan** — pembayaran online (payment gateway Indonesia) dan tunai di tempat (dicatat staff)
2. **Sewa tenant cafe** — tagihan bulanan otomatis per kontrak
3. **Pendaftaran event** — open play, coaching clinic, community gathering (gratis atau berbayar)
4. **Pendaftaran turnamen** — entry fee peserta

### Prinsip produk

1. **PostgreSQL adalah satu-satunya source of truth.** Semua data bisnis hidup di PostgreSQL.
   Redis boleh hilang total kapan saja tanpa merusak konsistensi bisnis — hanya performa dan
   kenyamanan UX yang terdegradasi. Setiap pemakaian Redis di dokumen ini **wajib**
   menjelaskan apa yang terjadi jika datanya hilang.
2. **Satu jalur ke database.** Hanya `apps/api` yang menyentuh PostgreSQL. Web, admin, dan
   mobile berkomunikasi lewat `packages/api-client`. Tidak ada pengecualian.
3. **Satu mekanisme klaim slot.** Booking customer, event, jadwal pertandingan, dan
   maintenance lapangan semuanya mengklaim waktu lapangan melalui **satu** tabel dan **satu**
   aturan (`slot_claims`). Lihat [03-DATA-MODEL.md § Slot Ownership](03-DATA-MODEL.md#8-slot-ownership-mekanisme-terpadu).
4. **Satu pipeline harga.** Semua perhitungan uang (booking, event berbayar, entry fee
   turnamen) melewati pipeline yang sama, didefinisikan sekali di
   [07-MODULE-PAYMENT.md § Pricing Pipeline](07-MODULE-PAYMENT.md#3-pricing-pipeline-satu-satunya-sumber-perhitungan-harga).
   Jangan pernah menghitung harga di tempat lain.
5. **Validasi sekali, dipakai di mana-mana.** Semua zod schema hidup di `packages/shared`
   dan dipakai oleh API maupun seluruh frontend.
6. **Setiap business rule harus bisa diuji.** Rule ditulis dengan angka dan kondisi konkret,
   bukan sifat ("cepat", "aman"). Kalau sebuah rule tidak bisa dijadikan test case, ia belum
   selesai ditulis.

### Konteks lokal (penting untuk implementasi)

| Hal | Nilai |
|---|---|
| Zona waktu operasional | **Asia/Makassar (WITA, UTC+8)** — Balikpapan |
| Mata uang | **IDR** (Rupiah), disimpan sebagai integer rupiah utuh tanpa desimal |
| Bahasa UI | Bahasa Indonesia (primary). Kode, nama tabel, dan nama variabel: **bahasa Inggris** |
| Bahasa dokumen | Bahasa Indonesia |

---

## 2. Target User & Peran

| Peran (role) | Siapa | Akses |
|---|---|---|
| `customer` | Pemain / penyewa lapangan | `apps/web`, `apps/mobile` |
| `admin` | Pemilik & manajemen (termasuk fungsi owner) | `apps/admin` |
| `staff` | Operasional harian: front desk, kasir, court marshal | `apps/admin` (subset) |
| `tenant` | Pemilik/PIC tenant cafe | `apps/admin` (portal terbatas: kontrak & tagihan sendiri) |

Detail izin per endpoint: [05-AUTH.md § RBAC Matrix](05-AUTH.md#6-rbac-matrix-per-endpoint).

> **Catatan:** hanya ada **4 role**. Tidak ada role `owner`, `super_admin`, `manager`, atau
> `coach` di v1. Fungsi owner dijalankan oleh `admin`.

---

## 3. Glossary Istilah Domain

Istilah di kolom "Nama teknis" adalah nama kanonik yang **wajib** dipakai di kode, nama tabel,
nama field API, dan dokumen lain. Jangan membuat sinonim.

### Lapangan & Waktu

| Istilah | Nama teknis | Definisi |
|---|---|---|
| **Venue** | `venues` | Gedung Hola. v1 **tepat satu baris**. Menyimpan alamat, timezone, jam operasional default. Jangan bangun fitur multi-venue. |
| **Sport** | `sports` | Jenis olahraga: `padel`, `futsal`, `badminton`, dst. Dipakai untuk mengelompokkan court, tutorial, dan leaderboard. |
| **Court** | `courts` | Satu lapangan fisik, mis. `PDL-01`. Punya sport, jam operasional, durasi slot, status. |
| **Slot** | — | Satu unit waktu terkecil yang bisa dijual di satu court. Identitas slot = `(court_id, starts_at)`. Durasi ditentukan `courts.slot_duration_minutes` (v1: **60 menit**). Slot **tidak punya baris tabel sendiri** — ia adalah posisi pada grid waktu yang dihitung dari jam operasional court. |
| **Slot grid** | — | Deretan `starts_at` yang sah untuk sebuah court pada satu tanggal. `starts_at` harus rata (aligned) terhadap `opens_at + n × slot_duration_minutes`. Waktu yang tidak rata grid **ditolak** (`SLOT_NOT_ALIGNED`). |
| **Slot claim** | `slot_claims` | **Satu-satunya** representasi "slot ini sudah diambil". Satu baris = satu klaim eksklusif atas `(court_id, starts_at)`. Pemiliknya bisa booking, event, match, atau maintenance. Lihat [03-DATA-MODEL.md § Slot Ownership](03-DATA-MODEL.md#8-slot-ownership-mekanisme-terpadu). |
| **Hold** | `slot_claims.status = 'held'` | Klaim sementara selama customer menyelesaikan pembayaran. Umur maksimal **10 menit** (`hold_expires_at`). Dijaga dua lapis: Redis key ber-TTL (lapis 1, cepat) + baris PostgreSQL dengan partial unique index (lapis 2, **final**). |
| **Takeover** | — | Aksi di dalam transaksi klaim: mengubah hold yang sudah kedaluwarsa menjadi `released` sebelum menyisipkan klaim baru pada slot yang sama. Wajib, karena predikat unique index tidak bisa memakai `now()`. |
| **Peak / Off-peak** | `rate_class` | Kelas tarif hasil pencocokan `price_rules`. Nilai: `peak`, `offpeak`, `special`. Bukan kolom bebas — selalu hasil resolusi rule. |
| **Blocked slot** | `claim_type = 'maintenance'` | Slot yang ditutup admin (perawatan, cuci lapangan, acara privat non-sistem). |

### Transaksi

| Istilah | Nama teknis | Definisi |
|---|---|---|
| **Booking** | `bookings` | Satu transaksi penyewaan lapangan oleh customer. Berisi 1..N `booking_items`, satu item = satu slot. |
| **Booking item** | `booking_items` | Satu slot di dalam booking. Memegang `court_id`, `starts_at`, `rate_class`, dan harga baris. Berkorespondensi 1:1 dengan satu `slot_claims`. |
| **Quote** | `quote_snapshot` (jsonb) | Hasil pipeline harga, dibekukan (immutable) saat booking dibuat. Menjadi bukti perhitungan; harga tidak boleh dihitung ulang setelah booking dibuat. |
| **Payment** | `payments` | Satu upaya pembayaran atas satu **payable** (booking / event registration / tournament registration / cafe invoice). |
| **Payable** | — | Objek yang bisa dibayar. Tepat 4 jenis, dipetakan sebagai kolom FK nullable di `payments` dengan CHECK "tepat satu tidak null". |
| **Refund** | `refunds` | Pengembalian dana atas payment yang sudah `paid`. Bisa penuh atau sebagian. |
| **Promo** | `promos` | Aturan diskon. Bisa berkode manual (`code`) atau otomatis (`is_auto = true`). |
| **Promo redemption** | `promo_redemptions` | Catatan pemakaian promo, sekaligus mekanisme kuota yang race-condition-safe. |

### Event & Pertandingan

| Istilah | Nama teknis | Definisi |
|---|---|---|
| **Event** | `events` | Acara internal Hola: `open_play`, `coaching_clinic`, `community_gathering`, `other`. Bisa gratis atau berbayar. Memblokir slot lapangan lewat `slot_claims` bertipe `event`. |
| **Event registration** | `event_registrations` | Pendaftaran satu peserta ke satu event. Bisa `waitlisted`. |
| **Waitlist** | `event_registrations.status = 'waitlisted'` | Daftar tunggu berurutan (`waitlist_position`). Promosi otomatis saat ada pembatalan. |
| **Tournament** | `tournaments` | Kompetisi berformat `knockout` atau `round_robin`. **Hanya dua format ini di v1.** |
| **Tournament registration** | `tournament_registrations` | Satu entri peserta di turnamen (single / double / team). Juga entitas peserta di bracket, memegang `seed`. |
| **Bracket** | `tournament_rounds` + `matches` | Struktur babak & pertandingan hasil generasi otomatis dari daftar peserta. |
| **Seed** | `tournament_registrations.seed` | Nomor unggulan peserta (1 = terbaik). Menentukan posisi awal di bracket. |
| **Bye** | `matches` dengan satu sisi `NULL` | Peserta lolos otomatis ke babak berikutnya karena jumlah peserta bukan pangkat dua. |
| **Walkover (WO)** | `matches.status = 'walkover'` | Pertandingan dimenangkan tanpa dimainkan karena lawan tidak hadir/mengundurkan diri. |
| **Standings** | `tournament_standings` | Tabel klasemen untuk format round-robin, dihitung ulang setiap match selesai. |
| **Match slot** | `claim_type = 'match'` | Slot lapangan yang diklaim untuk satu pertandingan terjadwal. |

### Gamification & CRM

| Istilah | Nama teknis | Definisi |
|---|---|---|
| **Point** | `point_ledger` | Poin gamification. Ledger **append-only**; koreksi dilakukan dengan baris bernilai negatif (reversal), bukan UPDATE/DELETE. |
| **Point rule** | `point_rules` | Aturan perolehan poin per aksi, beserta cap harian/periodik. |
| **Leaderboard period** | `leaderboard_periods` | Periode kompetisi poin, mis. `2026-07` (bulanan). Poin periodik berbeda dari `lifetime_points`. |
| **Leaderboard** | Redis ZSET + `leaderboard_snapshots` | Peringkat real-time di Redis sorted set; snapshot berkala ke PostgreSQL. Ledger tetap source of truth. |
| **Tier** | `tiers` | Tingkatan loyalitas berbasis `lifetime_points`: Bronze / Silver / Gold / Platinum. |
| **Badge** | `badges`, `user_badges` | Lencana pencapaian, sekali diperoleh permanen. |
| **Activity** | `activities` | Catatan aktivitas olahraga dari mobile app. Bisa `verified` (terkait booking/check-in) atau tidak. |

### Tenant Cafe

| Istilah | Nama teknis | Definisi |
|---|---|---|
| **Cafe tenant** | `cafe_tenants` | Badan usaha/orang yang menyewa ruang komersial di gedung Hola. ⚠️ **BUKAN** multi-tenancy SaaS. Tabel sengaja dinamai `cafe_tenants` (bukan `tenants`) agar tidak disalahartikan. Hola adalah aplikasi **single-tenant**; jangan pernah menambahkan kolom `tenant_id` untuk isolasi data. |
| **Cafe unit** | `cafe_units` | Ruang fisik yang disewakan, mis. `U-01`. |
| **Cafe contract** | `cafe_contracts` | Kontrak sewa antara Hola dan satu cafe tenant atas satu unit. |
| **Cafe invoice** | `cafe_invoices` | Tagihan bulanan hasil generasi cron dari kontrak aktif. |

### Keuangan

| Istilah | Nama teknis | Definisi |
|---|---|---|
| **Journal entry** | `journal_entries` | Satu jurnal (header) dengan minimal 2 baris. Total debit **wajib** sama dengan total kredit. |
| **Journal line** | `journal_lines` | Baris jurnal: akun + debit atau kredit. |
| **Account** | `accounts` | Chart of accounts minimal. Lihat [14-MODULE-FINANCE.md](14-MODULE-FINANCE.md). |
| **Contra revenue** | `accounts.type = 'contra_revenue'` | Akun pengurang pendapatan — dipakai untuk mencatat diskon/promo. |

### Teknis

| Istilah | Nama teknis | Definisi |
|---|---|---|
| **Idempotency key** | header `Idempotency-Key` | Kunci yang membuat POST berulang aman. Redis = lapis cepat; PostgreSQL (`payment_webhook_events.provider_event_id` UNIQUE) = jaminan durabel. |
| **Job** | BullMQ | Pekerjaan background. Nama kanonik berformat `<queue>.<jobName>`. Daftar lengkap: [02-INFRASTRUCTURE.md § BullMQ Jobs](02-INFRASTRUCTURE.md#5-daftar-lengkap-bullmq-jobs). |
| **Audit log** | `audit_logs` | Jejak perubahan data sensitif oleh admin/staff. |

---

## 4. Peta Dokumen

Urutan baca yang disarankan untuk AI yang baru masuk: **00 → 01 → 03 → 16**, lalu dokumen
modul sesuai tugas.

| File | Isi | Baca kalau kamu sedang… |
|---|---|---|
| [00-OVERVIEW.md](00-OVERVIEW.md) | Ringkasan produk, glossary, peta dokumen | selalu, pertama |
| [01-ARCHITECTURE.md](01-ARCHITECTURE.md) | Diagram arsitektur, keputusan teknis + alasan, batas tanggung jawab app/package | menambah app/package, memutuskan di mana kode ditaruh |
| [02-INFRASTRUCTURE.md](02-INFRASTRUCTURE.md) | Topologi deploy, aturan Redis, daftar BullMQ job, backup/restore, env vars, docker-compose | menyentuh Redis, queue, deployment, env |
| [03-DATA-MODEL.md](03-DATA-MODEL.md) | ERD, semua entitas & relasi, konvensi penamaan, **§ Slot Ownership** | menulis migration atau query apa pun |
| [04-API-CONTRACT.md](04-API-CONTRACT.md) | Konvensi endpoint, format response & error, pagination, versioning, katalog endpoint | menambah/mengubah endpoint |
| [05-AUTH.md](05-AUTH.md) | Strategi auth, token, RBAC matrix per endpoint | menyentuh login, guard, permission |
| [06-MODULE-BOOKING.md](06-MODULE-BOOKING.md) | User stories, aturan hold & anti double-booking, state machine booking | menyentuh booking/ketersediaan |
| [07-MODULE-PAYMENT.md](07-MODULE-PAYMENT.md) | Flow pembayaran, webhook + idempotency, refund, **§ Pricing Pipeline** | menyentuh uang, harga, gateway |
| [08-MODULE-PROMO.md](08-MODULE-PROMO.md) | Jenis diskon, aturan stacking, kuota race-safe, titik integrasi checkout | menyentuh promo/voucher |
| [09-MODULE-TENANT.md](09-MODULE-TENANT.md) | Kontrak sewa, siklus tagihan bulanan, penagihan | menyentuh tenant cafe |
| [10-MODULE-EVENT.md](10-MODULE-EVENT.md) | Lifecycle event, kuota & waitlist, relasi slot, event berbayar | menyentuh event |
| [11-MODULE-MATCH.md](11-MODULE-MATCH.md) | Knockout & round-robin, bracket generation, input skor, walkover | menyentuh turnamen/pertandingan |
| [12-MODULE-GAMIFICATION.md](12-MODULE-GAMIFICATION.md) | Tabel aturan poin, periode leaderboard, arsitektur ZSET + snapshot, badge, anti-abuse | menyentuh poin/leaderboard |
| [13-MODULE-CRM-HRIS.md](13-MODULE-CRM-HRIS.md) | Scope minimal CRM & HRIS + apa yang TIDAK termasuk | menyentuh data customer/karyawan |
| [14-MODULE-FINANCE.md](14-MODULE-FINANCE.md) | Jurnal sederhana, chart of accounts, sumber transaksi otomatis, laporan | menyentuh pencatatan keuangan |
| [15-MOBILE.md](15-MOBILE.md) | Scope mobile, aktivitas, tutorial, push notification, offline behavior | menyentuh `apps/mobile` |
| [16-CONVENTIONS.md](16-CONVENTIONS.md) | TypeScript strict, biome, vitest, struktur folder, pola service/repository, pola BullMQ & Redis | menulis kode apa pun |
| [17-NON-GOALS.md](17-NON-GOALS.md) | Daftar eksplisit fitur yang **TIDAK** dibangun | tergoda menambah fitur "sekalian" |

---

## 5. Daftar Modul Fitur (v1)

| # | Modul | Dokumen | Ringkas |
|---|---|---|---|
| 1 | Booking lapangan | [06](06-MODULE-BOOKING.md) | Jadwal, slot, harga peak/off-peak, hold 10 menit, anti double-booking |
| 2 | Pembayaran online | [07](07-MODULE-PAYMENT.md) | Payment gateway Indonesia, webhook idempoten, rekonsiliasi, refund |
| 3 | Diskon & promo | [08](08-MODULE-PROMO.md) | Voucher, persen/nominal, kuota, batasan, auto vs manual |
| 4 | Tenant cafe | [09](09-MODULE-TENANT.md) | Kontrak, tagihan bulanan otomatis, status pembayaran |
| 5 | Event | [10](10-MODULE-EVENT.md) | Registrasi, kuota, waitlist, memblokir slot |
| 6 | Pertandingan/turnamen | [11](11-MODULE-MATCH.md) | Knockout & round-robin, bracket, skor, standings, WO |
| 7 | Gamification & leaderboard | [12](12-MODULE-GAMIFICATION.md) | Poin, periode, tier, badge, anti-abuse |
| 8 | CRM | [13](13-MODULE-CRM-HRIS.md) | Profil customer, riwayat, loyalty |
| 9 | HRIS ringan | [13](13-MODULE-CRM-HRIS.md) | Karyawan, shift, absensi |
| 10 | Jurnal keuangan | [14](14-MODULE-FINANCE.md) | Pemasukan, pengeluaran, diskon sebagai contra-revenue, laporan |
| 11 | Mobile | [15](15-MOBILE.md) | Booking, aktivitas, tutorial, leaderboard, push |

---

## 6. Daftar Keputusan yang Masih Menggantung

Semua item di bawah ditandai `[BUTUH KEPUTUSAN CLIENT]` di dokumen asalnya, lengkap dengan
2–3 opsi dan trade-off. **Jangan** memilih sendiri di luar default yang tertulis.

| # | Keputusan | Dokumen | Default sementara (jika client belum menjawab) |
|---|---|---|---|
| D-01 | Kebijakan refund pembatalan booking | [06 § Refund Policy](06-MODULE-BOOKING.md#7-kebijakan-pembatalan--refund-butuh-keputusan-client) | Opsi B — refund berjenjang (>48j 100% dikurangi fee gateway, 24–48j 50%, <24j 0%) |
| D-02 | Stacking promo | [08 § Stacking](08-MODULE-PROMO.md#4-aturan-stacking-butuh-keputusan-client) | Tanpa stacking — maksimum **satu** promo per transaksi |
| D-03 | Poin punya nilai tukar? | [12 § Nilai Tukar Poin](12-MODULE-GAMIFICATION.md#9-nilai-tukar-poin-butuh-keputusan-client) | Tidak — poin hanya untuk peringkat & badge (tanpa liability keuangan) |
| D-04 | Notifikasi WhatsApp | [02 § Notifikasi](02-INFRASTRUCTURE.md#7-notifikasi) | Tidak aktif di v1 (feature flag `NOTIF_WHATSAPP_ENABLED=false`) |
| D-05 | Hosting video tutorial | [15 § Tutorial](15-MOBILE.md#5-modul-tutorial) | YouTube unlisted embed |
| D-06 | PPN / pajak di harga | [07 § Pipeline step 8](07-MODULE-PAYMENT.md#33-detail-per-step) | `tax_rate = 0`; harga dianggap tax-inclusive |
| D-07 | Biaya payment gateway dibebankan ke customer? | [07 § Pipeline step 9](07-MODULE-PAYMENT.md#33-detail-per-step) | Diserap Hola (`fee_amount = 0` di quote) |
| D-08 | Uptime monitoring: Uptime Kuma self-host vs Better Stack | [02 § Observability](02-INFRASTRUCTURE.md#9-observability) | Uptime Kuma self-host di VPS yang sama |
| D-09 | Membership berbayar (langganan) | [13 § CRM](13-MODULE-CRM-HRIS.md#3-loyalty--membership) | Tidak ada di v1; loyalty = tier berbasis poin |
| D-10 | Deposit tenant: dikembalikan atau dipotong? mekanisme akhir kontrak | [09 § Deposit](09-MODULE-TENANT.md#8-deposit-butuh-keputusan-client) | Deposit dicatat sebagai liability, dikembalikan penuh jika tidak ada tunggakan |

---

## 7. Rekomendasi Final Vendor & Layanan

Ringkasan; alasan lengkap ada di dokumen yang dirujuk.

| Kebutuhan | Rekomendasi final | Alasan singkat | Detail |
|---|---|---|---|
| Payment gateway | **Midtrans (Snap)** | Cakupan QRIS/GoPay/VA terbaik untuk pasar lokal, checkout siap pakai, sandbox mudah. Xendit disiapkan sebagai provider kedua lewat port interface untuk kebutuhan invoicing/disbursement tenant di masa depan. | [07 § Pemilihan Gateway](07-MODULE-PAYMENT.md#2-pemilihan-payment-gateway-keputusan-final) |
| Object storage | **Cloudflare R2** (produksi), **RustFS** (local dev) | Egress gratis, S3-compatible, tanpa beban ops. RustFS memberi parity S3 lokal di docker-compose. | [02 § Object Storage](02-INFRASTRUCTURE.md#6-object-storage) |
| Email | **Resend** (SMTP fallback) | API sederhana, domain verification jelas, murah di volume kecil. | [02 § Notifikasi](02-INFRASTRUCTURE.md#7-notifikasi) |
| Push mobile | **Expo Push (EAS)** | Sudah menyatu dengan Expo; tidak perlu kelola sertifikat APNs/FCM manual. | [15 § Push Notification](15-MOBILE.md#7-push-notification) |
| Auth | **JWT access token pendek + refresh token opaque di DB** | Mobile tidak nyaman dengan cookie; API beda origin dari web/admin. Revokasi via tabel refresh token. | [05 § Rekomendasi](05-AUTH.md#3-session-vs-jwt-rekomendasi--alasan) |
| Error tracking | **Sentry** (api, web, admin, mobile) | Satu vendor untuk 4 surface, source map & Expo support matang. | [02 § Observability](02-INFRASTRUCTURE.md#9-observability) |
| Uptime | **Uptime Kuma** self-host | Nol biaya, cukup untuk 1 VPS. | D-08 |

---

## 8. Definisi "Selesai" untuk v1

Sebuah modul dianggap selesai jika **semua** berikut benar:

1. Schema Drizzle + migration ada di `packages/db`, dan nama tabel/kolomnya sama dengan
   [03-DATA-MODEL.md](03-DATA-MODEL.md).
2. Zod schema input/output ada di `packages/shared` dan dipakai API + frontend.
3. Endpoint terdaftar di [04-API-CONTRACT.md § Katalog Endpoint](04-API-CONTRACT.md#9-katalog-endpoint-v1)
   dan punya baris di [05-AUTH.md § RBAC Matrix](05-AUTH.md#6-rbac-matrix-per-endpoint).
4. Setiap business rule di dokumen modulnya punya minimal satu test vitest.
5. Setiap edge case di bagian "Edge Cases" dokumen modulnya punya test atau catatan
   "diterima sebagai perilaku" yang eksplisit.
6. `pnpm typecheck && pnpm lint && pnpm test` hijau.
7. Job BullMQ yang dipakai modul terdaftar di
   [02-INFRASTRUCTURE.md § BullMQ Jobs](02-INFRASTRUCTURE.md#5-daftar-lengkap-bullmq-jobs)
   dengan nama identik.

---

## 9. Aturan untuk AI Coding Assistant

1. **Jangan mengganti stack.** Monorepo, Hono, Drizzle, PostgreSQL, Redis, BullMQ, Next.js,
   Expo, Docker, Dokploy sudah final.
2. **Jangan akses DB dari `apps/web`, `apps/admin`, atau `apps/mobile`.** Termasuk: jangan
   import `packages/db` dari sana, jangan pakai Server Action Next.js yang query langsung.
3. **Jangan duplikasi logika harga.** Panggil pipeline di [07](07-MODULE-PAYMENT.md).
4. **Jangan buat mekanisme klaim slot baru.** Pakai `slot_claims`.
5. **Jangan tambah fitur yang tidak ada di dokumen modul.** Cek
   [17-NON-GOALS.md](17-NON-GOALS.md) lebih dulu.
6. **Jangan taruh data bisnis hanya di Redis.** Kalau kamu tidak bisa menjawab "apa yang
   terjadi kalau Redis flush?", desainnya salah.
7. **Jangan mengarang keputusan bisnis.** Kalau ketemu `[BUTUH KEPUTUSAN CLIENT]`, pakai
   default yang tertulis dan tandai di kode dengan komentar `// [D-xx] default sementara`.
8. **Jangan tulis kode implementasi di dalam `docs/`.** Dokumen hanya kontrak, schema, aturan.
