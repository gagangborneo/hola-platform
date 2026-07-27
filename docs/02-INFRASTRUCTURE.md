# 02 — INFRASTRUCTURE

> Prasyarat: [00-OVERVIEW.md](00-OVERVIEW.md), [01-ARCHITECTURE.md](01-ARCHITECTURE.md).
> Semua nama job BullMQ di dokumen ini adalah **nama kanonik**. Modul lain (dokumen 06–15)
> hanya boleh merujuk nama yang ada di [§ 5](#5-daftar-lengkap-bullmq-jobs).

---

## 1. Topologi Deployment

```mermaid
graph TB
    subgraph internet["Internet"]
        USR["Browser / Mobile App"]
        MTX["Midtrans"]
        GH["GitHub Actions"]
        RSND["Resend"]
        EXP["Expo Push (EAS)"]
        SNT["Sentry"]
        OFF[("Offsite Backup Bucket<br/>Cloudflare R2")]
    end

    subgraph cf["Cloudflare"]
        DNS["DNS + Proxy + WAF dasar"]
        R2[("R2 Bucket<br/>hola-media")]
    end

    subgraph vps["VPS — Dokploy"]
        TRF["Traefik<br/>TLS (Let's Encrypt)<br/>routing per domain"]

        subgraph apps["Containers Aplikasi"]
            WEB["hola-web<br/>Next.js :3000"]
            ADMIN["hola-admin<br/>Next.js :3000"]
            API["hola-api<br/>Hono :4000<br/>/healthz /readyz"]
            WORKER["hola-worker<br/>BullMQ (tanpa port publik)"]
        end

        subgraph data["Containers Data (volume persisten)"]
            PG[("postgres:16<br/>volume: pgdata")]
            RDS[("redis:7<br/>volume: redisdata<br/>AOF everysec")]
        end

        subgraph ops["Containers Operasional"]
            KUMA["uptime-kuma"]
            BQD["bull-board<br/>(dilindungi basic auth)"]
            BKP["hola-backup<br/>cron pg_dump → R2"]
        end
    end

    USR --> DNS
    DNS --> TRF
    TRF -->|hola.id| WEB
    TRF -->|admin.hola.id| ADMIN
    TRF -->|api.hola.id| API
    TRF -->|status.hola.id| KUMA
    TRF -->|queue.hola.id| BQD

    MTX -->|"POST /api/v1/webhooks/midtrans"| TRF
    API -->|charge / status / refund| MTX

    WEB -->|server & client fetch| API
    ADMIN -->|server & client fetch| API
    USR -->|"presigned PUT"| R2
    USR -->|"GET media (public read)"| R2

    API --> PG
    API --> RDS
    WORKER --> PG
    WORKER --> RDS
    WORKER --> RSND
    WORKER --> EXP
    API --> R2

    BKP --> PG
    BKP --> OFF

    API --> SNT
    WORKER --> SNT
    WEB --> SNT
    ADMIN --> SNT

    KUMA -->|"probe /healthz"| API
    KUMA -->|"probe /"| WEB
    KUMA -->|"probe /"| ADMIN

    GH -->|"deploy webhook per app"| TRF
```

### Domain & routing

| Domain | Container | Catatan |
|---|---|---|
| `hola.id`, `www.hola.id` | `hola-web` | Landing + booking customer |
| `admin.hola.id` | `hola-admin` | Dashboard admin/staff/tenant |
| `api.hola.id` | `hola-api` | REST + webhook. CORS: hanya origin web/admin + `*` untuk mobile via token |
| `status.hola.id` | `uptime-kuma` | Status page publik (opsional) |
| `queue.hola.id` | `bull-board` | **Wajib** di balik basic auth + IP allowlist |
| `media.hola.id` | R2 custom domain | Public read untuk foto lapangan, poster, thumbnail |

> Domain di atas placeholder. Domain final `[BUTUH KEPUTUSAN CLIENT]` — tapi ini keputusan
> operasional, bukan produk; tidak diblokir.

---

## 2. Daftar Container & Sumber Daya

| Container | Image / build | Port internal | Volume | Restart | Healthcheck |
|---|---|---|---|---|---|
| `hola-api` | build `apps/api/Dockerfile` | 4000 | — | `unless-stopped` | `GET /healthz` (liveness), `GET /readyz` (cek PG + Redis) |
| `hola-worker` | build `apps/api/Dockerfile`, `CMD ["node","dist/worker.js"]` | — | — | `unless-stopped` | proses menulis heartbeat ke Redis `hola:{env}:worker:heartbeat` tiap 30s; Uptime Kuma push monitor memeriksa via endpoint API `/healthz/worker` |
| `hola-web` | build `apps/web/Dockerfile` | 3000 | — | `unless-stopped` | `GET /` 200 |
| `hola-admin` | build `apps/admin/Dockerfile` | 3000 | — | `unless-stopped` | `GET /` 200 |
| `postgres` | `postgres:16-alpine` | 5432 | `pgdata:/var/lib/postgresql/data` | `unless-stopped` | `pg_isready` |
| `redis` | `redis:7-alpine` | 6379 | `redisdata:/data` | `unless-stopped` | `redis-cli ping` |
| `hola-backup` | image kecil berisi `postgresql-client` + `rclone` | — | akses ke `pgdata` tidak perlu (pakai `pg_dump` via jaringan) | `unless-stopped` | log terakhir < 26 jam |
| `uptime-kuma` | `louislam/uptime-kuma` | 3001 | `kuma:/app/data` | `unless-stopped` | — |
| `bull-board` | build kecil di `apps/api` (`CMD ["node","dist/bullboard.js"]`) | 4100 | — | `unless-stopped` | — |

Konfigurasi Redis wajib (`redis.conf` atau flag):

```
appendonly yes
appendfsync everysec
maxmemory-policy noeviction
```

**Alasan `noeviction` (bukan `allkeys-lru`):** Redis menyimpan hold slot dan job BullMQ.
Eviksi acak pada key hold atau data queue akan menghilangkan job. Dengan `noeviction`, jika
memori penuh, penulisan gagal keras dan kita melihatnya di Sentry — jauh lebih baik daripada
kehilangan job secara senyap. Cache ketersediaan dan rate limit selalu dibuat dengan TTL
eksplisit sehingga tidak menumpuk.

**Alasan AOF `everysec`:** kehilangan ≤1 detik data Redis dapat diterima (semuanya
rekonstruktibel), tetapi AOF mempercepat pemulihan queue setelah restart container sehingga
job terjadwal tidak perlu dibangun ulang manual.

---

## 3. Alur Deployment

```mermaid
sequenceDiagram
    autonumber
    participant DEV as Developer
    participant GH as GitHub
    participant CI as GitHub Actions
    participant DK as Dokploy (VPS)
    participant PG as PostgreSQL

    DEV->>GH: push / merge PR ke main
    GH->>CI: trigger workflow ci.yml
    CI->>CI: pnpm install --frozen-lockfile
    CI->>CI: turbo run typecheck
    CI->>CI: turbo run lint (biome)
    CI->>CI: turbo run test (vitest)
    CI->>CI: turbo run build
    alt ada job yang gagal
        CI-->>DEV: gagal, deploy TIDAK dijalankan
    else semua hijau
        CI->>DK: POST deploy webhook (per app yang berubah)
        DK->>DK: build image Docker
        DK->>PG: release step: pnpm db:migrate (satu kali)
        alt migration gagal
            DK-->>DEV: rollback, container lama tetap melayani
        else migration sukses
            DK->>DK: start container baru, healthcheck
            DK->>DK: swap traffic, hentikan container lama
        end
    end
```

### Aturan deployment

1. **CI wajib hijau sebelum deploy.** Gate: `typecheck`, `lint`, `test`, `build`, dan
   `guard-db-boundary` (lihat [01 § 2](01-ARCHITECTURE.md#2-aturan-keras-semua-akses-database-lewat-appsapi)).
2. **Migration hanya maju (forward-only).** Tidak ada `down` migration di produksi. Perubahan
   yang merusak dilakukan dua tahap: (a) tambah kolom nullable + tulis ganda, (b) hapus kolom
   lama di deploy berikutnya.
3. **Migration dijalankan sekali per deploy** sebagai release step, bukan di `CMD` container
   (menghindari race saat replica >1).
4. **Worker di-deploy setelah API.** Worker memakai schema terbaru; jika worker naik lebih
   dulu, handler baru bisa mengacu kolom yang belum ada.
5. **Urutan deploy multi-app:** `api` → `worker` → `web` → `admin`.
6. **Rollback:** Dokploy menyimpan image sebelumnya; rollback aplikasi = redeploy tag lama.
   Rollback **schema** tidak dilakukan; jika migration bermasalah, buat migration perbaikan
   maju.
7. **Mobile tidak ikut alur ini.** `apps/mobile` dirilis via EAS Build/Submit + EAS Update.
   Lihat [15 § Rilis](15-MOBILE.md#10-rilis--versioning).

### GitHub Actions — workflow yang ada

| Workflow | Trigger | Isi |
|---|---|---|
| `ci.yml` | `pull_request`, `push` ke `main` | install → `typecheck`, `lint`, `test`, `build`, `guard-db-boundary`. Service container: postgres + redis untuk integration test. |
| `deploy.yml` | `push` ke `main` (setelah `ci.yml` sukses, `workflow_run`) | Panggil Dokploy webhook per app. Secret: `DOKPLOY_WEBHOOK_API`, `DOKPLOY_WEBHOOK_WORKER`, `DOKPLOY_WEBHOOK_WEB`, `DOKPLOY_WEBHOOK_ADMIN`. |
| `mobile-preview.yml` | manual (`workflow_dispatch`) | EAS build profile `preview`. |
| `db-restore-drill.yml` | `schedule` bulanan + manual | Uji restore backup ke database sementara, jalankan smoke query, laporkan hasil. Lihat [§ 10](#10-backup--restore). |

---

## 4. Aturan Penggunaan Redis

> **Aturan induk:** data di Redis **selalu boleh hilang** tanpa merusak konsistensi bisnis.
> Sebelum menambahkan pemakaian Redis baru, jawab tertulis: *"apa yang terjadi kalau key ini
> hilang?"* Kalau jawabannya menyentuh uang, jadwal, atau poin yang tidak bisa direkonstruksi
> dari PostgreSQL, **jangan** taruh di Redis.

### 4.1 Namespace key

Semua key diawali `hola:{env}:` dengan `{env}` ∈ `local` | `staging` | `prod`. Builder key
adalah fungsi pure di `packages/shared/src/redis-keys.ts` — **jangan** menyusun string key
secara ad-hoc di service.

| Fungsi | Pola key | Tipe | TTL |
|---|---|---|---|
| Hold slot | `hola:{env}:hold:slot:{courtId}:{startsAtIso}` | string | 600 s (10 menit) |
| Cache ketersediaan | `hola:{env}:avail:{courtId}:{yyyy-mm-dd}` | string (JSON) | 60 s |
| Rate limit | `hola:{env}:rl:{bucket}:{identifier}` | string (counter) | sesuai window |
| Idempotency (fast path) | `hola:{env}:idem:{scope}:{key}` | string (JSON hasil) | 86400 s (24 jam) |
| Leaderboard | `hola:{env}:lb:{scope}:{periodId}` | zset | tanpa TTL (rebuildable) |
| Kuota promo (advisory) | `hola:{env}:promo:quota:{promoId}` | string (counter) | sampai `valid_until` + 1 hari |
| Lock ringan | `hola:{env}:lock:{name}` | string (SET NX PX) | ≤ 30 s |
| Worker heartbeat | `hola:{env}:worker:heartbeat` | string (ISO ts) | 90 s |
| BullMQ | `hola:{env}:bull:*` | dikelola BullMQ | — |

### 4.2 BOLEH disimpan di Redis

| # | Kegunaan | Detail | Jika data hilang |
|---|---|---|---|
| R-1 | **Hold slot saat checkout (lapis 1)** | `SET key value NX EX 600`. Memberi penolakan instan saat dua user memilih slot yang sama dalam hitungan detik, sebelum transaksi PostgreSQL. | Tidak ada double booking. Hold sebenarnya tetap ada sebagai baris `slot_claims` berstatus `held` dengan `hold_expires_at`, dijaga **partial unique index** di PostgreSQL. Efeknya hanya: dua request bersamaan sampai ke PostgreSQL, salah satunya menerima error unique dan diterjemahkan menjadi `409 SLOT_ALREADY_CLAIMED`. |
| R-2 | **Rate limiting API** | Fixed window counter per bucket (lihat [§ 4.5](#45-konfigurasi-rate-limit)). | Rate limit hilang sementara → limiter **fail-open** (request diizinkan, log `warn`, metrik `rate_limit_degraded`). Ini disengaja: menolak seluruh traffic karena Redis mati lebih buruk daripada kehilangan proteksi rate limit sementara. Perlindungan berlapis tetap ada di Cloudflare. |
| R-3 | **Cache ketersediaan slot** | JSON hasil perhitungan slot tersedia untuk satu court satu tanggal. TTL 60 s + invalidasi eksplisit (lihat [§ 4.4](#44-aturan-invalidasi-cache-ketersediaan)). | Cache miss → dihitung ulang dari PostgreSQL. Hanya lebih lambat. **Tidak pernah** dipakai sebagai dasar keputusan klaim slot — klaim selalu memvalidasi ulang di dalam transaksi PostgreSQL. |
| R-4 | **Idempotency key (fast path)** | Menyimpan hasil response untuk `Idempotency-Key` yang sama selama 24 jam, dan menandai webhook yang sedang/sudah diproses. | Jaminan idempotency **tidak** bergantung pada Redis. Sumber durabelnya: `payment_webhook_events.provider_event_id` UNIQUE di PostgreSQL untuk webhook, dan `idempotency_records.key` UNIQUE untuk POST client. Kehilangan Redis hanya berarti satu pemrosesan ulang yang berujung pada pelanggaran unique constraint dan penanganan "sudah diproses". |
| R-5 | **Leaderboard sorted set** | `ZINCRBY` saat poin diberikan; `ZREVRANGE` untuk membaca peringkat. Scope: `global`, `sport:{sportCode}`. | Rebuild penuh dari `point_ledger` lewat job `gamification.rebuildLeaderboard`. Sementara belum rebuild, API leaderboard membaca `leaderboard_snapshots` terbaru dari PostgreSQL (fallback otomatis) dan menandai response `"stale": true`. |
| R-6 | **Counter kuota promo (advisory)** | Pre-check cepat agar promo yang jelas habis ditolak tanpa menyentuh DB. | Tidak berpengaruh pada kebenaran. Kuota final ditegakkan dengan `UPDATE promos SET quota_used = quota_used + 1 WHERE id = ? AND (quota_total IS NULL OR quota_used < quota_total) RETURNING *` — atomik di PostgreSQL. Lihat [08 § 5](08-MODULE-PROMO.md#5-validasi-kuota-race-condition-safe). |
| R-7 | **Lock ringan untuk job non-kritis** | Mencegah dua eksekusi paralel job cron pada window yang sama. | Job dirancang idempoten, jadi eksekusi ganda tidak merusak data; lock hanya menghemat pekerjaan. |
| R-8 | **Data internal BullMQ** | Queue, delayed set, repeatable job. | Job yang belum dieksekusi hilang. Mitigasi: (a) setiap job punya "sweeper" periodik yang mencari pekerjaan tertinggal dari PostgreSQL (contoh: `booking.releaseExpiredHolds` menemukan hold kedaluwarsa dari kolom `hold_expires_at`, bukan dari daftar job); (b) job cron didaftarkan ulang saat worker start (`upsertJobScheduler`) sehingga jadwal pulih otomatis. Lihat [§ 5.3](#53-ketahanan-job-terhadap-kehilangan-redis). |

### 4.3 TIDAK BOLEH disimpan di Redis

| Dilarang | Mengapa | Tempat yang benar |
|---|---|---|
| Booking, `booking_items`, `slot_claims` | Data transaksional; kehilangan = jadwal kacau & sengketa dengan customer | PostgreSQL |
| Payment, refund, status pembayaran | Data uang | PostgreSQL (+`payment_webhook_events` untuk audit) |
| `point_ledger` (perolehan poin) | Poin adalah hak user; harus bisa diaudit & di-rebuild | PostgreSQL. Redis hanya menyimpan **agregat** peringkat |
| Kuota promo sebagai satu-satunya sumber | Race + kehilangan = over-redemption yang merugikan uang | `promos.quota_used` + `promo_redemptions` di PostgreSQL |
| Session sebagai satu-satunya sumber | Kehilangan = semua user ter-logout dan refresh token tak bisa divalidasi | `refresh_tokens` di PostgreSQL. Redis hanya untuk denylist `jti` sementara |
| Data tenant, kontrak, invoice | Dokumen komersial | PostgreSQL |
| Jurnal keuangan | Catatan akuntansi | PostgreSQL |
| Data absensi/HRIS | Catatan kepegawaian | PostgreSQL |
| File/gambar (blob) | Bukan fungsi Redis | Object storage (R2/MinIO) |
| Hasil laporan yang dipakai untuk pengambilan keputusan finansial tanpa jejak | Tidak bisa diaudit | PostgreSQL (`finance_daily_summaries`) — Redis boleh meng-cache **presentasinya** dengan TTL pendek |

### 4.4 Aturan invalidasi cache ketersediaan

Key: `hola:{env}:avail:{courtId}:{date}` (tanggal dalam zona **Asia/Makassar**).
TTL dasar: **60 detik**. TTL bukan pengganti invalidasi — ia hanya batas atas keterlambatan.

**Invalidasi WAJIB dilakukan (DELETE key) setelah transaksi PostgreSQL commit**, pada semua
kejadian berikut:

| # | Kejadian | Key yang dihapus | Dipicu oleh |
|---|---|---|---|
| I-1 | `slot_claims` dibuat (status `held` atau `confirmed`) | `avail:{court_id}:{date(starts_at)}` untuk setiap slot yang diklaim | service `slots.claim()` |
| I-2 | `slot_claims` berubah status menjadi `released` | idem | service `slots.release()`, job `booking.releaseExpiredHolds` |
| I-3 | Booking dibatalkan / kedaluwarsa | idem, semua tanggal item terdampak | service booking, job `payment.expireUnpaid` |
| I-4 | Event dijadwalkan / dibatalkan / diubah jadwalnya | idem | service event |
| I-5 | Match dijadwalkan / dijadwalkan ulang / dibatalkan | idem | service match |
| I-6 | Maintenance/penutupan lapangan dibuat atau dibatalkan | idem | service courts |
| I-7 | `price_rules` berubah (create/update/delete/aktivasi) | **semua** key `avail:*` (SCAN + DEL berdasarkan prefix) — karena harga ikut disajikan di response ketersediaan | service pricing |
| I-8 | `court_operating_hours` atau `courts.slot_duration_minutes` berubah | semua key `avail:{court_id}:*` | service courts |
| I-9 | `courts.status` berubah (mis. jadi `maintenance`) | semua key `avail:{court_id}:*` | service courts |
| I-10 | Hari libur / `special_dates` ditambah atau dihapus | semua key `avail:*:{date}` | service settings |

Aturan tambahan:
- Invalidasi dilakukan **setelah commit**, dalam blok yang kegagalannya tidak membatalkan
  transaksi (hanya log `warn`). Cache basah maksimal 60 detik karena TTL.
- Response ketersediaan menyertakan `generated_at` dan header `X-Cache: HIT|MISS` agar
  masalah cache basah dapat didiagnosis.
- **Cache tidak pernah menjadi dasar keputusan klaim.** Klaim selalu memeriksa ulang di dalam
  transaksi (`SELECT ... FOR UPDATE` pada baris court + insert `slot_claims`).
- Penghapusan berpola prefix (I-7, I-8, I-9, I-10) memakai `SCAN` bertahap (`COUNT 200`),
  **bukan** `KEYS`.

### 4.5 Konfigurasi rate limit

Semua limit dihitung per **fixed window**. Identifier: `user:{userId}` jika terautentikasi,
selain itu `ip:{clientIp}` (diambil dari header yang diset Traefik/Cloudflare).

| Bucket | Endpoint | Limit | Window | Identifier |
|---|---|---|---|---|
| `auth-login` | `POST /auth/login` | 5 | 60 s | ip + email (gabungan) |
| `auth-register` | `POST /auth/register` | 3 | 3600 s | ip |
| `auth-otp` | `POST /auth/otp/request` | 3 | 600 s | phone |
| `auth-refresh` | `POST /auth/refresh` | 30 | 60 s | ip |
| `booking-quote` | `POST /bookings/quote` | 60 | 60 s | user/ip |
| `booking-create` | `POST /bookings` | 10 | 60 s | user |
| `promo-validate` | `POST /promos/validate` | 20 | 60 s | user/ip |
| `availability-read` | `GET /courts/:id/availability` | 120 | 60 s | user/ip |
| `activity-create` | `POST /me/activities` | 20 | 3600 s | user |
| `webhook-midtrans` | `POST /webhooks/midtrans` | 600 | 60 s | ip (Midtrans) — hanya proteksi banjir; **tidak pernah** menolak berdasarkan user |
| `default-read` | semua `GET` lain | 300 | 60 s | user/ip |
| `default-write` | semua `POST/PATCH/DELETE` lain | 60 | 60 s | user |

Response saat limit terlampaui: `429` dengan body error standar (`code: RATE_LIMITED`) dan
header `Retry-After` (detik). Detail format: [04 § Error](04-API-CONTRACT.md#5-format-error).

**Fail-open:** jika Redis tidak dapat dihubungi, limiter mengizinkan request dan mencatat
`warn` + metrik. Pengecualian: bucket `auth-login` dan `auth-otp` tetap fail-open, tetapi
kegagalan Redis >1 menit memicu alert Sentry berprioritas tinggi.

---

## 5. Daftar Lengkap BullMQ Jobs

### 5.1 Queue

Enam queue. Nama queue adalah konstanta di `packages/shared/src/constants/queues.ts`.

| Queue | Isi | Concurrency worker |
|---|---|---|
| `booking` | Siklus hidup booking & hold slot | 5 |
| `payment` | Webhook, rekonsiliasi, refund, kedaluwarsa | 5 |
| `commerce` | Promo, event, match, tenant cafe (domain transaksional non-uang langsung) | 5 |
| `gamification` | Poin, leaderboard, tier, badge | 3 |
| `notification` | Email, push, WhatsApp | 10 |
| `system` | Finance posting, backup, cleanup, laporan | 2 |

### 5.2 Tabel job

Kolom:
- **Trigger** — `event` (dipanggil service), `repeat:<interval>`, `cron:<expr>` (zona
  Asia/Makassar), `delayed` (dijadwalkan pada waktu tertentu), `manual` (dipicu admin).
- **Retry** — `attempts` × strategi backoff.
- **Idempotency** — apa yang membuat eksekusi berulang aman. **Setiap job wajib punya kolom
  ini terisi.**

| # | Nama job (kanonik) | Queue | Trigger | Retry | Idempotency | Dipakai oleh |
|---|---|---|---|---|---|---|
| J-01 | `booking.releaseExpiredHolds` | booking | `repeat:60s` | 3 × fixed 10 s | Query berbasis kondisi (`status='held' AND hold_expires_at < now()`), bukan daftar id. `UPDATE ... WHERE status='held'` sehingga baris yang sudah dilepas tidak berubah dua kali. | [06 § 4](06-MODULE-BOOKING.md#4-hold-slot--anti-double-booking) |
| J-02 | `booking.autoCompleteBookings` | booking | `repeat:15m` | 3 × fixed 30 s | `UPDATE bookings SET status='completed' WHERE status='confirmed' AND ends_at < now() - interval '30 minutes'` — kondisional, aman diulang. Emisi poin lewat J-16 yang punya unique key sendiri. | [06 § 8](06-MODULE-BOOKING.md#8-state-machine-status-booking) |
| J-03 | `booking.sendBookingReminder` | booking | `delayed` (pada `starts_at − 2 jam`), dibuat saat booking `confirmed` | 3 × exp 60 s | `jobId = "reminder:{bookingId}"`. BullMQ menolak jobId duplikat. Handler juga memeriksa `bookings.status='confirmed'` sebelum mengirim. | [06](06-MODULE-BOOKING.md) |
| J-04 | `booking.markNoShow` | booking | `delayed` (pada `ends_at + 30 menit`) | 3 × fixed 30 s | `jobId = "noshow:{bookingId}"`; `UPDATE ... WHERE status='confirmed' AND checked_in_at IS NULL`. | [06 § 8](06-MODULE-BOOKING.md#8-state-machine-status-booking) |
| J-05 | `payment.processWebhook` | payment | `event` — dienqueue oleh handler HTTP webhook setelah menyimpan payload | 5 × exp mulai 5 s (5 s, 10 s, 20 s, 40 s, 80 s) | `jobId = "wh:{provider}:{providerEventId}"`. Baris `payment_webhook_events` punya UNIQUE `(provider, provider_event_id)`; handler keluar lebih awal jika `processed_at IS NOT NULL`. | [07 § 5](07-MODULE-PAYMENT.md#5-webhook-handling--idempotency) |
| J-06 | `payment.reconcilePending` | payment | `repeat:5m` | 3 × fixed 60 s | Query berbasis kondisi (`payments.status='pending' AND created_at < now() - interval '5 minutes'`); memanggil API status gateway; transisi status hanya lewat fungsi transisi yang menolak transisi tidak sah. | [07 § 6](07-MODULE-PAYMENT.md#6-rekonsiliasi) |
| J-07 | `payment.expireUnpaid` | payment | `delayed` (pada `payments.expires_at`) + disapu ulang oleh J-06 | 5 × exp 30 s | `jobId = "expire:{paymentId}"`; `UPDATE payments SET status='expired' WHERE id=? AND status='pending'`. | [07 § 4](07-MODULE-PAYMENT.md#4-flow-pembayaran-end-to-end) |
| J-08 | `payment.processRefund` | payment | `event` (setelah refund disetujui admin) | 5 × exp 60 s | `jobId = "refund:{refundId}"`; state `refunds.status` hanya maju; call gateway memakai `refunds.id` sebagai reference id sehingga gateway menolak duplikat. | [07 § 7](07-MODULE-PAYMENT.md#7-refund-flow) |
| J-09 | `commerce.releaseExpiredPromoReservations` | commerce | `repeat:60s` | 3 × fixed 10 s | Kondisional: `promo_redemptions.status='reserved' AND reserved_until < now()`; pengurangan `quota_used` dilakukan dalam transaksi yang sama dengan perubahan status sehingga tidak bisa dobel. | [08 § 5](08-MODULE-PROMO.md#5-validasi-kuota-race-condition-safe) |
| J-10 | `commerce.generateMonthlyInvoices` | commerce | `cron:0 1 1 * *` (tanggal 1, 01:00 WITA) | 3 × exp 300 s | UNIQUE `(contract_id, period_year, period_month)` di `cafe_invoices`; insert memakai `ON CONFLICT DO NOTHING`. | [09 § 4](09-MODULE-TENANT.md#4-siklus-tagihan-bulanan) |
| J-11 | `commerce.markOverdueInvoices` | commerce | `cron:0 2 * * *` | 3 × fixed 60 s | Kondisional: `status IN ('issued','partially_paid') AND due_date < current_date`. | [09 § 5](09-MODULE-TENANT.md#5-status-tagihan--penagihan) |
| J-12 | `commerce.sendInvoiceReminder` | commerce | `cron:0 8 * * *` | 3 × fixed 60 s | Tabel `notifications` punya UNIQUE `(user_id, template_code, dedupe_key)` dengan `dedupe_key = "invoice:{invoiceId}:{offsetLabel}"`. | [09 § 5](09-MODULE-TENANT.md#5-status-tagihan--penagihan) |
| J-13 | `commerce.flagExpiringContracts` | commerce | `cron:0 3 * * 1` (Senin 03:00) | 3 × fixed 60 s | Kondisional: `status='active' AND end_date <= current_date + 60`; update ke `status='expiring'` idempoten. | [09 § 3](09-MODULE-TENANT.md#3-kontrak-sewa) |
| J-14 | `commerce.closeEventRegistration` | commerce | `delayed` (pada `events.registration_closes_at`) | 3 × fixed 30 s | `jobId = "evtclose:{eventId}"`; `UPDATE events SET status='registration_closed' WHERE id=? AND status='registration_open'`. | [10 § 3](10-MODULE-EVENT.md#3-lifecycle-event) |
| J-15 | `commerce.promoteEventWaitlist` | commerce | `event` (saat registrasi dibatalkan / kuota naik) | 3 × exp 15 s | Dijalankan dalam transaksi dengan `SELECT ... FOR UPDATE` pada baris event; promosi hanya mengubah baris berstatus `waitlisted` dengan posisi terkecil. | [10 § 5](10-MODULE-EVENT.md#5-kuota--waitlist) |
| J-16 | `commerce.finalizeEvent` | commerce | `delayed` (pada `events.ends_at + 2 jam`) | 3 × fixed 60 s | `jobId = "evtfinal:{eventId}"`; transisi `ongoing → completed` kondisional; poin kehadiran lewat J-19. | [10 § 3](10-MODULE-EVENT.md#3-lifecycle-event) |
| J-17 | `commerce.generateBracket` | commerce | `event` (admin menutup pendaftaran & memulai seeding) | 1 (tanpa retry otomatis; kegagalan ditampilkan ke admin untuk retry manual) | `tournaments.bracket_generated_at IS NULL` diperiksa dalam transaksi; UNIQUE `(tournament_id, round_id, match_number)` di `matches`. | [11 § 4](11-MODULE-MATCH.md#4-bracket-generation) |
| J-18 | `commerce.recomputeStandings` | commerce | `event` (setiap match `completed`/`walkover`) | 5 × exp 10 s | Perhitungan penuh dari `matches` lalu `INSERT ... ON CONFLICT (tournament_id, group_id, registration_id) DO UPDATE` — hasilnya deterministik, aman diulang. | [11 § 7](11-MODULE-MATCH.md#7-standings-round-robin) |
| J-19 | `gamification.awardPoints` | gamification | `event` (dari outbox `point_events`, diproses `repeat:30s`) | 5 × exp 15 s | UNIQUE `(user_id, rule_code, source_type, source_id)` di `point_ledger` + `INSERT ... ON CONFLICT DO NOTHING`. | [12 § 3](12-MODULE-GAMIFICATION.md#3-tabel-aturan-poin) |
| J-20 | `gamification.reversePoints` | gamification | `event` (booking dibatalkan/di-refund setelah poin diberikan, skor match dikoreksi) | 5 × exp 15 s | UNIQUE `(user_id, rule_code, source_type, source_id)` dengan `rule_code` bersuffiks `:REVERSAL`, sehingga hanya bisa satu kali. | [12 § 8](12-MODULE-GAMIFICATION.md#8-anti-abuse) |
| J-21 | `gamification.snapshotLeaderboard` | gamification | `cron:10 0 * * *` (00:10 WITA) | 3 × fixed 120 s | UNIQUE `(period_id, scope, user_id, snapshot_date)` di `leaderboard_snapshots` + upsert. | [12 § 6](12-MODULE-GAMIFICATION.md#6-arsitektur-leaderboard) |
| J-22 | `gamification.rebuildLeaderboard` | gamification | `manual` + otomatis saat worker mendeteksi ZSET periode aktif kosong padahal `point_ledger` tidak kosong | 3 × fixed 60 s | Membangun ulang ZSET dari nol: `DEL` lalu `ZADD` batch dari agregat `point_ledger`. Hasil deterministik. | [12 § 6](12-MODULE-GAMIFICATION.md#6-arsitektur-leaderboard) |
| J-23 | `gamification.closeLeaderboardPeriod` | gamification | `cron:5 0 1 * *` (tanggal 1, 00:05 WITA) | 3 × fixed 300 s | `UPDATE leaderboard_periods SET status='closed' WHERE id=? AND status='active'`; snapshot final memakai idempotency J-21. | [12 § 5](12-MODULE-GAMIFICATION.md#5-periode--reset-leaderboard) |
| J-24 | `gamification.recalculateTiers` | gamification | `cron:30 0 * * *` | 3 × fixed 60 s | Menghitung tier dari `customer_profiles.lifetime_points`; update hanya jika berbeda (idempoten). | [12 § 7](12-MODULE-GAMIFICATION.md#7-tier--badge) |
| J-25 | `notification.sendEmail` | notification | `event` | 5 × exp 30 s | `jobId = "notif:{notificationId}"`; baris `notifications` bertransisi `queued → sent`; handler keluar jika sudah `sent`. | semua modul |
| J-26 | `notification.sendPush` | notification | `event` | 3 × exp 15 s | idem J-25. Token yang ditolak Expo (`DeviceNotRegistered`) ditandai `revoked_at`. | [15 § 7](15-MOBILE.md#7-push-notification) |
| J-27 | `notification.sendWhatsapp` | notification | `event` (aktif hanya jika `NOTIF_WHATSAPP_ENABLED=true`) | 5 × exp 60 s | idem J-25. | D-04 |
| J-28 | `system.postJournalEntries` | system | `repeat:5m` | 5 × exp 60 s | Baca outbox `finance_events` berstatus `pending`; UNIQUE `(source_type, source_id, kind)` di `journal_entries` mencegah jurnal ganda. | [14 § 5](14-MODULE-FINANCE.md#5-sumber-transaksi-otomatis) |
| J-29 | `system.buildDailySummary` | system | `cron:30 1 * * *` | 3 × fixed 300 s | UNIQUE `summary_date` di `finance_daily_summaries` + upsert (rekomputasi penuh untuk tanggal tersebut). | [14 § 7](14-MODULE-FINANCE.md#7-laporan) |
| J-30 | `system.backupDatabase` | system | `cron:0 3 * * *` | 2 × fixed 900 s | Nama objek backup deterministik per tanggal (`hola-YYYYMMDD-HHmm.dump`); upload menimpa objek yang sama jika retry di hari yang sama. | [§ 10](#10-backup--restore) |
| J-31 | `system.cleanupExpiredTokens` | system | `cron:0 4 * * *` | 3 × fixed 60 s | `DELETE FROM refresh_tokens WHERE expires_at < now() - interval '30 days' OR revoked_at < now() - interval '30 days'`. | [05 § 5](05-AUTH.md#5-siklus-hidup-token) |
| J-32 | `system.cleanupOrphanUploads` | system | `cron:0 5 * * 0` (Minggu 05:00) | 3 × fixed 300 s | `media_files` berstatus `pending` & `created_at < now() - interval '24 hours'` → hapus objek storage lalu hapus baris. Penghapusan objek yang sudah tidak ada tidak dianggap error. | [§ 6](#6-object-storage) |
| J-33 | `system.pruneAuditLogs` | system | `cron:0 5 1 * *` | 3 × fixed 300 s | `DELETE FROM audit_logs WHERE created_at < now() - interval '24 months'`. | [13](13-MODULE-CRM-HRIS.md) |
| J-34 | `system.reindexActivityVerification` | system | `repeat:1h` | 3 × fixed 60 s | Menandai `activities.verified=true` jika ada booking `completed` yang cocok (user, court, rentang waktu). Kondisional & idempoten. | [15 § 4](15-MOBILE.md#4-modul-aktivitas-olahraga) |

### 5.3 Ketahanan job terhadap kehilangan Redis

Kalau Redis di-flush, semua job yang belum jalan hilang. Desain kita bertahan karena:

| Kategori job | Mekanisme pemulihan |
|---|---|
| **Repeatable & cron** — J-01, J-02, J-06, J-09, J-10, J-11, J-12, J-13, J-21, J-23, J-24, J-28, J-29, J-30, J-31, J-32, J-33, J-34, J-35, J-36 | Didaftarkan ulang saat worker **start** memakai `upsertJobScheduler` dengan `jobId` tetap. Restart worker memulihkan seluruh jadwal tanpa intervensi. |
| **Delayed** — J-03, J-04, J-07, J-14, J-16 | Setiap job delayed **wajib** punya pasangan *sweeper* `repeat` yang menemukan pekerjaan tertinggal langsung dari kondisi di PostgreSQL, bukan dari daftar job di Redis. Pasangan resmi ada di tabel di bawah. |
| **Event-driven yang tidak boleh hilang** — J-19, J-20, J-28 | Memakai **outbox di PostgreSQL** (`point_events`, `finance_events`). Enqueue hanya percepatan; job periodik memindai outbox. Kehilangan Redis tidak menghilangkan pekerjaan. |
| **Event-driven best-effort** — J-25, J-26, J-27 | Boleh hilang. Baris `notifications` tetap berstatus `queued` dan disapu J-36. |
| **Event-driven yang di-retry manual** — J-05, J-08, J-15, J-17, J-18 | J-05 dilindungi retry Midtrans + J-06. J-08 & J-17 punya tombol retry di admin (statusnya terlihat di UI). J-15 & J-18 dipanggil ulang secara idempoten setiap kali data sumbernya berubah. |

**Aturan sweeper (final):** setiap job `delayed` punya tepat satu sweeper resmi.

| Job delayed | Sweeper resmi | Kondisi yang dicari sweeper |
|---|---|---|
| J-03 `booking.sendBookingReminder` | J-02 `booking.autoCompleteBookings` | booking `confirmed` dengan `starts_at` dalam 2 jam ke depan dan belum punya baris `notifications` dengan `dedupe_key='booking:{id}:reminder2h'` → enqueue ulang J-03 |
| J-04 `booking.markNoShow` | J-02 `booking.autoCompleteBookings` | `status='confirmed' AND ends_at + interval '30 minutes' < now() AND checked_in_at IS NULL` |
| J-07 `payment.expireUnpaid` | J-06 `payment.reconcilePending` | `payments.status='pending' AND expires_at < now()` |
| J-14 `commerce.closeEventRegistration` | J-35 `commerce.sweepEventStates` | `events.status='registration_open' AND registration_closes_at < now()` |
| J-16 `commerce.finalizeEvent` | J-35 `commerce.sweepEventStates` | `events.status='ongoing' AND ends_at + interval '2 hours' < now()` |
| J-25 / J-26 / J-27 (notifikasi menganggur) | J-36 `notification.retryStuckNotifications` | `notifications.status='queued' AND created_at < now() - interval '5 minutes'` |

Dua job sweeper di atas adalah bagian resmi dari daftar job:

| # | Nama job | Queue | Trigger | Retry | Idempotency |
|---|---|---|---|---|---|
| J-35 | `commerce.sweepEventStates` | commerce | `repeat:10m` | 3 × fixed 60 s | Transisi kondisional atas `events` (`registration_open → registration_closed` jika `registration_closes_at < now()`; `published/registration_closed → ongoing` jika `starts_at <= now()`; `ongoing → completed` jika `ends_at + 2h < now()`). Semua `UPDATE ... WHERE status = <status asal>`. |
| J-36 | `notification.retryStuckNotifications` | notification | `repeat:5m` | 3 × fixed 60 s | Cari `notifications.status='queued' AND created_at < now() - interval '5 minutes'` → enqueue ulang dengan `jobId = "notif:{id}"`, yang ditolak jika job masih ada. |

Satu job HRIS yang berdiri sendiri (dipakai [13 § 6.2](13-MODULE-CRM-HRIS.md#62-absensi)):

| # | Nama job | Queue | Trigger | Retry | Idempotency |
|---|---|---|---|---|---|
| J-37 | `system.markMissingAttendance` | system | `cron:0 1 * * *` (01:00 WITA) | 3 × fixed 120 s | Untuk setiap `shift_assignments` dengan `work_date < current_date` yang belum punya baris `attendances`, `INSERT ... ON CONFLICT (employee_id, work_date) DO NOTHING` dengan `status` = `leave` \| `holiday` \| `absent` sesuai kondisi. Kondisional & idempoten. |

> **Total job resmi v1: J-01 … J-37 (37 job).** Modul lain hanya boleh merujuk nama dari
> tabel ini. Menambah job baru = menambah baris di sini lebih dulu.

### 5.4 Aturan umum job

1. **Semua handler job wajib idempoten.** Tidak ada pengecualian. Kolom "Idempotency" di
   tabel adalah bagian dari kontrak, bukan catatan.
2. **`removeOnComplete`**: simpan 1000 job terakhir per queue; **`removeOnFail`**: simpan 5000.
   Cukup untuk investigasi tanpa membengkakkan Redis.
3. **Job gagal permanen** (attempts habis) → kirim ke Sentry dengan tag `job_name`,
   `job_id`, dan payload yang sudah disanitasi (tanpa PII sensitif & tanpa nomor kartu).
4. **Timeout job**: default 30 s. Job yang memanggil provider eksternal (J-05, J-06, J-08,
   J-25, J-26, J-27): 60 s. Job batch (J-10, J-22, J-29, J-30): 600 s.
5. **Payload job minimal** — hanya id, bukan seluruh objek. Handler membaca ulang dari
   PostgreSQL. Alasan: payload yang menua di queue bisa berisi data basi.
6. **Jangan enqueue di dalam transaksi DB.** Enqueue setelah commit, atau (jika tidak boleh
   hilang) pakai outbox.
7. **Semua job cron memakai timezone `Asia/Makassar`** secara eksplisit di opsi repeat.

---

## 6. Object Storage

### Keputusan: Cloudflare R2 untuk produksi, MinIO untuk local dev

| Kriteria | Cloudflare R2 | MinIO self-host di VPS |
|---|---|---|
| Biaya egress | **Gratis** | Terpakai bandwidth VPS (kuota terbatas, biaya overage) |
| Biaya storage | ~$0.015/GB/bulan | Termasuk disk VPS (tapi disk VPS mahal per GB dan ikut menekan pgdata) |
| Ops | Nol (managed) | Perlu monitoring disk, backup bucket sendiri, tuning |
| Latensi ke Indonesia | Baik (edge Cloudflare, ada PoP Jakarta) | Sangat baik (satu VPS) tapi tanpa CDN |
| S3 compatibility | Ya (SDK sama) | Ya |
| Risiko | Vendor lock ringan (bisa migrasi karena S3 API) | Kehilangan disk VPS = kehilangan media, kecuali di-backup terpisah |

**Rekomendasi final: Cloudflare R2.** Alasan penentu: media publik (foto lapangan, poster
event, thumbnail tutorial) akan dibaca jauh lebih sering daripada ditulis, dan egress gratis
membuat biaya dapat diprediksi tanpa membebani bandwidth VPS. MinIO tetap dipakai di
docker-compose lokal agar developer tidak butuh kredensial cloud.

### Bucket & struktur prefix

| Bucket | Akses | Isi |
|---|---|---|
| `hola-media` | public read via `media.hola.id`, write hanya via presigned URL | `courts/{courtId}/{mediaId}.{ext}`, `events/{eventId}/poster-{mediaId}.{ext}`, `tutorials/{tutorialId}/thumb-{mediaId}.{ext}`, `sports/{sportCode}/icon.{ext}` |
| `hola-private` | private (akses hanya lewat presigned GET, TTL 15 menit) | `contracts/{contractId}/{mediaId}.pdf`, `invoices/{invoiceId}.pdf`, `payment-proofs/{invoiceId}/{mediaId}.{ext}`, `employees/{employeeId}/{mediaId}.{ext}` |
| `hola-backup` | private, versioning aktif, lifecycle rule | `pg/YYYY/MM/hola-YYYYMMDD-HHmm.dump`, `redis/…` (opsional) |

### Alur upload (presigned)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (web/admin)
    participant A as apps/api
    participant S as R2 / MinIO
    C->>A: POST /media/presign {kind, contentType, sizeBytes}
    A->>A: validasi kind, mime allowlist, batas ukuran, RBAC
    A->>A: INSERT media_files (status='pending', key, expected_mime, expected_size)
    A->>S: buat presigned PUT (TTL 10 menit)
    A-->>C: {mediaId, uploadUrl, key}
    C->>S: PUT file (langsung, tanpa lewat API)
    C->>A: POST /media/:mediaId/confirm
    A->>S: HEAD object (verifikasi ada, mime, ukuran)
    A->>A: UPDATE media_files SET status='ready', size_bytes, content_type
    A-->>C: {mediaId, url}
    Note over A: media_files status 'pending' > 24 jam<br/>dibersihkan job J-32 system.cleanupOrphanUploads
```

Batas & validasi:

| Kind | Mime yang diizinkan | Maks ukuran | Bucket |
|---|---|---|---|
| `court_photo` | `image/jpeg`, `image/png`, `image/webp` | 5 MB | `hola-media` |
| `event_poster` | `image/jpeg`, `image/png`, `image/webp` | 5 MB | `hola-media` |
| `tutorial_thumbnail` | `image/jpeg`, `image/png`, `image/webp` | 2 MB | `hola-media` |
| `avatar` | `image/jpeg`, `image/png`, `image/webp` | 2 MB | `hola-media` |
| `contract_document` | `application/pdf` | 10 MB | `hola-private` |
| `payment_proof` | `image/jpeg`, `image/png`, `application/pdf` | 5 MB | `hola-private` |

Aturan: API **tidak** melakukan resize/transcode di v1. Client wajib mengompres gambar
sebelum upload (web: canvas; mobile: `expo-image-manipulator`). Varian ukuran gambar
memakai Cloudflare Image Resizing di level URL jika dibutuhkan.

### Video tutorial — `[BUTUH KEPUTUSAN CLIENT]` (D-05)

| Opsi | Biaya | Kelebihan | Kekurangan |
|---|---|---|---|
| **A. YouTube unlisted + embed** *(default v1)* | Rp 0 | Tanpa biaya bandwidth/transcode, adaptive bitrate otomatis, player matang di web & mobile (`react-native-youtube-iframe`) | Branding YouTube, ada "video terkait" pada beberapa mode, butuh internet (tanpa download offline), konten bisa ditemukan jika URL bocor, bergantung kebijakan YouTube |
| **B. Self-host HLS di R2 + Cloudflare** | Storage ~$0.015/GB/bln, egress gratis, **biaya transcode & pipeline dibangun sendiri** | Kontrol penuh, tanpa branding pihak ketiga, bisa akses terbatas (presigned) | Butuh pipeline transcode (ffmpeg worker), player HLS, effort paling besar, risiko kualitas playback |
| **C. Cloudflare Stream** | ~$5 / 1.000 menit tersimpan/bln + ~$1 / 1.000 menit ditonton | Transcode & player siap, analitik, signed URL | Biaya berulang bertumbuh dengan penonton, vendor lock lebih kuat |

**Rekomendasi: Opsi A untuk v1.** Skema data sudah menampung migrasi: `tutorials.video_provider`
∈ `youtube` | `r2` | `stream`, dan `tutorials.video_ref` menyimpan id/URL sesuai provider.
Ganti provider = ganti data + player, tanpa migrasi schema.

---

## 7. Notifikasi

### Kanal

| Kanal | Provider | Dipakai untuk | Job |
|---|---|---|---|
| `email` | **Resend** (fallback SMTP via env `SMTP_*`) | Konfirmasi booking, e-receipt pembayaran, invoice tenant + reminder, reset password, pengumuman event | J-25 `notification.sendEmail` |
| `push` | **Expo Push (EAS)** | Reminder booking H-2 jam, promosi dari waitlist, jadwal match, perubahan jadwal, promo baru, perubahan peringkat leaderboard akhir periode | J-26 `notification.sendPush` |
| `inapp` | internal (`notifications` + endpoint) | Semua kanal juga menulis baris `inapp` agar user punya inbox | — (dibuat sinkron) |
| `whatsapp` | `[BUTUH KEPUTUSAN CLIENT]` (D-04) | Reminder booking & tagihan tenant | J-27 `notification.sendWhatsapp` |

### `[BUTUH KEPUTUSAN CLIENT]` D-04 — WhatsApp

| Opsi | Biaya | Trade-off |
|---|---|---|
| **A. Tidak aktif di v1** *(default)* | Rp 0 | Email + push cukup untuk customer; tenant dihubungi manual oleh admin. Risiko: tingkat baca email di Indonesia rendah. |
| **B. WhatsApp Business API resmi** (via BSP: Qontak / Wati / Twilio) | Biaya per percakapan (kategori *utility* ± Rp 200–400/percakapan) + biaya platform bulanan | Paling andal & legal, template harus disetujui Meta, butuh verifikasi bisnis. Cocok untuk reminder booking dan tagihan tenant. |
| **C. Gateway tidak resmi (unofficial WA)** | Murah | **Tidak direkomendasikan** — melanggar ToS WhatsApp, nomor bisa diblokir, risiko kehilangan kanal komunikasi bisnis. |

Implementasi disiapkan sebagai adapter: `NotificationChannelAdapter` dengan implementasi
`resend`, `expo`, `noop` (untuk `whatsapp` saat flag off). Mengaktifkan WhatsApp = menambah
satu adapter + set `NOTIF_WHATSAPP_ENABLED=true`, tanpa mengubah kode pemanggil.

### Aturan notifikasi

1. Setiap notifikasi punya `template_code` yang terdaftar di `notification_templates`.
2. **Dedupe wajib.** `notifications` punya UNIQUE `(user_id, template_code, dedupe_key)`.
   Contoh `dedupe_key`: `booking:{bookingId}:reminder2h`, `invoice:{invoiceId}:due-3d`.
3. Preferensi user (`customer_profiles.notification_prefs` jsonb) dapat mematikan kanal
   `push`/`email` untuk kategori non-transaksional. **Notifikasi transaksional (konfirmasi
   booking, pembayaran, refund, tagihan) tidak dapat dimatikan.**
4. Quiet hours untuk push non-transaksional: **22:00–07:00 WITA** — job menunda pengiriman ke
   07:00, tidak membatalkannya.
5. Isi notifikasi tidak boleh memuat data sensitif (nomor kartu, token, password).

---

## 8. Daftar Environment Variable per App

Aturan:
- Setiap app punya **satu** `.env.example` yang **wajib sinkron** dengan daftar di bawah.
- Env divalidasi saat **boot** memakai zod (`packages/shared/src/env/`, satu schema per app).
  Aplikasi **gagal start** jika ada env wajib yang hilang atau tidak valid — bukan gagal saat
  request pertama.
- CI menjalankan `pnpm check:env` yang membandingkan kunci di `.env.example` dengan kunci di
  schema zod; ketidaksinkronan = CI gagal.
- Variabel yang dikirim ke browser **wajib** berawalan `NEXT_PUBLIC_` (Next.js) atau
  `EXPO_PUBLIC_` (Expo). Apa pun yang rahasia **tidak boleh** memakai prefiks itu.
- `DATABASE_URL` dan `REDIS_URL` **hanya** ada di `apps/api` (dan worker). Tidak pernah di app
  frontend.

### 8.1 `apps/api` (dipakai container `hola-api` dan `hola-worker`)

| Variabel | Wajib | Contoh / default | Keterangan |
|---|---|---|---|
| `NODE_ENV` | ✓ | `production` | `development` \| `test` \| `production` |
| `APP_ENV` | ✓ | `prod` | `local` \| `staging` \| `prod`. Dipakai sebagai prefiks Redis key |
| `PORT` | — | `4000` | Port HTTP |
| `API_BASE_URL` | ✓ | `https://api.hola.id` | Dipakai untuk menyusun callback URL gateway |
| `WEB_BASE_URL` | ✓ | `https://hola.id` | Redirect setelah pembayaran, link di email |
| `ADMIN_BASE_URL` | ✓ | `https://admin.hola.id` | Link di email untuk staff/tenant |
| `CORS_ORIGINS` | ✓ | `https://hola.id,https://admin.hola.id` | Daftar dipisah koma |
| `DATABASE_URL` | ✓ | `postgres://hola:pw@postgres:5432/hola` | — |
| `DATABASE_POOL_MAX` | — | `10` | Ukuran pool per proses |
| `REDIS_URL` | ✓ | `redis://redis:6379` | — |
| `JWT_ACCESS_SECRET` | ✓ | (32+ byte random) | Penandatangan access token |
| `JWT_ACCESS_TTL` | — | `15m` | Umur access token |
| `REFRESH_TOKEN_TTL_DAYS` | — | `30` | Umur refresh token |
| `PASSWORD_PEPPER` | ✓ | (random) | Ditambahkan sebelum hashing argon2id |
| `COOKIE_DOMAIN` | ✓ | `.hola.id` | Domain cookie refresh token |
| `TZ_BUSINESS` | — | `Asia/Makassar` | Zona waktu operasional |
| `SLOT_HOLD_TTL_SECONDS` | — | `600` | Umur hold slot (10 menit) |
| `PAYMENT_EXPIRY_MINUTES` | — | `15` | Umur transaksi pembayaran di gateway |
| `MIDTRANS_SERVER_KEY` | ✓ | — | Rahasia |
| `MIDTRANS_CLIENT_KEY` | ✓ | — | Dikirim ke frontend lewat endpoint config, bukan env frontend |
| `MIDTRANS_MERCHANT_ID` | ✓ | — | — |
| `MIDTRANS_IS_PRODUCTION` | ✓ | `true` | `false` untuk sandbox |
| `MIDTRANS_WEBHOOK_ALLOWED_IPS` | — | (kosong) | Opsional allowlist tambahan |
| `S3_ENDPOINT` | ✓ | `https://<acct>.r2.cloudflarestorage.com` | MinIO lokal: `http://minio:9000` |
| `S3_REGION` | ✓ | `auto` | — |
| `S3_ACCESS_KEY_ID` | ✓ | — | — |
| `S3_SECRET_ACCESS_KEY` | ✓ | — | — |
| `S3_BUCKET_MEDIA` | ✓ | `hola-media` | — |
| `S3_BUCKET_PRIVATE` | ✓ | `hola-private` | — |
| `S3_BUCKET_BACKUP` | ✓ | `hola-backup` | — |
| `S3_FORCE_PATH_STYLE` | — | `false` | `true` untuk MinIO |
| `MEDIA_PUBLIC_BASE_URL` | ✓ | `https://media.hola.id` | Basis URL publik objek `hola-media` |
| `RESEND_API_KEY` | ✓* | — | *Wajib jika `MAIL_TRANSPORT=resend` |
| `MAIL_TRANSPORT` | — | `resend` | `resend` \| `smtp` \| `console` |
| `MAIL_FROM` | ✓ | `Hola <noreply@hola.id>` | — |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | — | — | Dipakai jika `MAIL_TRANSPORT=smtp` |
| `EXPO_ACCESS_TOKEN` | ✓ | — | Untuk Expo Push API |
| `NOTIF_WHATSAPP_ENABLED` | — | `false` | D-04 |
| `WHATSAPP_PROVIDER` / `WHATSAPP_API_KEY` / `WHATSAPP_SENDER` | — | — | Hanya jika WhatsApp aktif |
| `SENTRY_DSN` | — | — | Kosong = Sentry mati |
| `SENTRY_TRACES_SAMPLE_RATE` | — | `0.1` | — |
| `LOG_LEVEL` | — | `info` | pino |
| `RATE_LIMIT_ENABLED` | — | `true` | `false` hanya untuk test |
| `BULLBOARD_USER` / `BULLBOARD_PASSWORD` | ✓ | — | Basic auth dashboard queue |
| `BACKUP_ENABLED` | — | `true` | — |
| `BACKUP_RETENTION_DAYS` | — | `30` | — |

### 8.2 `apps/web`

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `NODE_ENV` | ✓ | `production` | — |
| `NEXT_PUBLIC_APP_ENV` | ✓ | `prod` | — |
| `NEXT_PUBLIC_API_BASE_URL` | ✓ | `https://api.hola.id` | Dipakai `packages/api-client` di browser |
| `API_BASE_URL_INTERNAL` | — | `http://hola-api:4000` | Untuk fetch server-side di dalam jaringan Docker (lebih cepat, tidak keluar-masuk proxy) |
| `NEXT_PUBLIC_WEB_BASE_URL` | ✓ | `https://hola.id` | Canonical URL, OG tags |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | ✓ | `https://media.hola.id` | — |
| `NEXT_PUBLIC_SENTRY_DSN` | — | — | — |
| `SENTRY_AUTH_TOKEN` | — | — | Upload source map saat build (build-time saja) |
| `NEXT_PUBLIC_GA_ID` | — | — | Opsional analytics |

> Tidak ada `DATABASE_URL`, `REDIS_URL`, `MIDTRANS_SERVER_KEY`, atau `JWT_*` di sini.
> `MIDTRANS_CLIENT_KEY` diambil runtime dari `GET /api/v1/config/public`, bukan dari env web,
> supaya rotasi key tidak butuh rebuild frontend.

### 8.3 `apps/admin`

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `NODE_ENV` | ✓ | `production` | — |
| `NEXT_PUBLIC_APP_ENV` | ✓ | `prod` | — |
| `NEXT_PUBLIC_API_BASE_URL` | ✓ | `https://api.hola.id` | — |
| `API_BASE_URL_INTERNAL` | — | `http://hola-api:4000` | — |
| `NEXT_PUBLIC_ADMIN_BASE_URL` | ✓ | `https://admin.hola.id` | — |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | ✓ | `https://media.hola.id` | — |
| `NEXT_PUBLIC_SENTRY_DSN` | — | — | — |
| `SENTRY_AUTH_TOKEN` | — | — | build-time |

### 8.4 `apps/mobile`

Expo memakai `app.config.ts` + `EXPO_PUBLIC_*`. Rahasia build (kredensial store) hidup di EAS
Secrets, bukan di repo.

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | ✓ | `prod` | — |
| `EXPO_PUBLIC_API_BASE_URL` | ✓ | `https://api.hola.id` | — |
| `EXPO_PUBLIC_MEDIA_BASE_URL` | ✓ | `https://media.hola.id` | — |
| `EXPO_PUBLIC_SENTRY_DSN` | — | — | — |
| `EXPO_PUBLIC_WEB_BASE_URL` | ✓ | `https://hola.id` | Untuk membuka halaman pembayaran / T&C |
| `EAS_PROJECT_ID` | ✓ | — | di `app.config.ts` |
| `SENTRY_AUTH_TOKEN` | — | — | EAS Secret, upload source map |
| `GOOGLE_SERVICES_JSON` / `APPLE_*` | — | — | EAS Secret, kredensial push/native |

### 8.5 `packages/db` (hanya untuk tooling migration)

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✓ | Dipakai `drizzle-kit generate` / `migrate` / `studio` |

---

## 9. Observability

### Logging (pino di `apps/api`)

| Aturan | Detail |
|---|---|
| Format | JSON satu baris. `pino-pretty` hanya di `NODE_ENV=development`. |
| Field wajib tiap log request | `request_id` (ULID, juga dikembalikan sebagai header `X-Request-Id`), `method`, `path`, `status`, `duration_ms`, `user_id` (jika ada), `role`, `ip` |
| Field wajib tiap log job | `job_name`, `job_id`, `attempt`, `duration_ms`, `outcome` |
| Redaction wajib | `password`, `password_hash`, `token`, `refresh_token`, `authorization`, `cookie`, `card`, `cvv`, `MIDTRANS_SERVER_KEY`, seluruh `signature_key` webhook |
| Level | `error` = butuh tindakan; `warn` = degradasi (mis. Redis down, cache miss beruntun); `info` = request & transisi state bisnis; `debug` = hanya non-produksi |
| Log transisi state bisnis | **Wajib** untuk: booking status, payment status, refund status, event status, match status, invoice status. Format: `{ event: "booking.status_changed", booking_id, from, to, actor }` |

### Sentry

| App | Yang dikirim |
|---|---|
| `apps/api` | Unhandled error, error 5xx, job gagal permanen, kegagalan integrasi gateway. Tracing 10%. Tag: `request_id`, `user_id`, `route`, `job_name` |
| `apps/web` / `apps/admin` | Client & server error, source map di-upload saat build, `release` = git SHA |
| `apps/mobile` | Crash native & JS, `release` = versi + `runtimeVersion` EAS Update |

Aturan: error yang **diharapkan** (validasi gagal, 401, 403, 404, 409 konflik slot, promo
tidak valid) **tidak** dikirim ke Sentry. Hanya dicatat log level `info`/`warn`. Kalau Sentry
penuh dengan 409 slot, alert jadi tidak berguna.

### Metrik minimal (endpoint `GET /internal/metrics`, dilindungi token)

| Metrik | Kegunaan |
|---|---|
| `http_requests_total{route,status}` | Kesehatan API |
| `http_request_duration_ms` (p50/p95/p99) | Latensi |
| `slot_claim_conflicts_total` | Seberapa sering dua user berebut slot — indikator kebutuhan UX |
| `redis_degraded_total{feature}` | Berapa kali Redis gagal & fitur fail-open |
| `bull_jobs_total{queue,job,outcome}` | Kesehatan queue |
| `bull_queue_depth{queue}` | Penumpukan job |
| `payment_webhook_total{result}` | Rasio webhook valid/invalid/duplikat |
| `payment_reconcile_fixed_total` | Berapa payment yang diperbaiki rekonsiliasi (idealnya rendah) |
| `leaderboard_rebuilds_total` | Frekuensi kehilangan ZSET |

### Uptime monitoring — `[BUTUH KEPUTUSAN CLIENT]` D-08

| Opsi | Biaya | Trade-off |
|---|---|---|
| **A. Uptime Kuma self-host di VPS yang sama** *(default)* | Rp 0 | Cukup untuk 1 VPS, punya status page & notifikasi. **Kelemahan serius:** kalau VPS mati, monitornya mati juga → tidak ada alert. Mitigasi: tambahkan satu monitor eksternal gratis (mis. cron-job.org / healthchecks.io) yang mem-ping `/healthz` dan mengirim alert. |
| **B. Better Stack (Uptime)** | Free tier terbatas, paid dari ~$25/bln | Monitoring eksternal sungguhan, on-call schedule, status page terkelola. |
| **C. Uptime Kuma self-host + healthchecks.io untuk dead-man's switch** | Rp 0 | Kompromi yang paling masuk akal secara teknis: Kuma untuk detail, healthchecks.io untuk "apakah seluruh VPS masih hidup" dan "apakah cron backup jalan". |

**Rekomendasi: Opsi C.** Tetap Uptime Kuma (sesuai default), ditambah satu dead-man's switch
eksternal yang di-ping oleh job `system.backupDatabase` dan oleh cron ringan tiap 5 menit.

Monitor yang wajib ada:

| Monitor | Target | Interval | Alert |
|---|---|---|---|
| API liveness | `GET https://api.hola.id/healthz` | 60 s | 2 kegagalan berturut |
| API readiness | `GET https://api.hola.id/readyz` (cek PG + Redis) | 120 s | 2 kegagalan |
| Web | `GET https://hola.id/` | 300 s | 2 kegagalan |
| Admin | `GET https://admin.hola.id/` | 300 s | 2 kegagalan |
| Worker heartbeat | push monitor dari worker tiap 60 s | grace 5 menit | 1 kegagalan |
| Backup harian | push monitor dari J-30 setelah upload sukses | grace 26 jam | 1 kegagalan |
| Sertifikat TLS | expiry check | harian | < 14 hari |
| Kedalaman queue | `GET /internal/metrics` (custom keyword) | 300 s | `bull_queue_depth > 500` |

---

## 10. Backup & Restore

### Strategi backup

| Aspek | Keputusan |
|---|---|
| Alat | `pg_dump --format=custom --compress=9` (bukan SQL plain — agar `pg_restore` bisa selektif & paralel) |
| Frekuensi | Harian 03:00 WITA (job J-30 `system.backupDatabase`) |
| Retensi lokal | 7 hari terakhir di volume VPS (`/backups`) |
| Retensi offsite | 30 backup harian + 12 backup bulanan (backup tanggal 1 dipertahankan 12 bulan) di bucket `hola-backup` (R2) |
| Enkripsi | Objek dienkripsi di sisi penyedia (R2 SSE). Untuk data pribadi karyawan & kontrak, **tambahan** enkripsi `age`/`gpg` sebelum upload dengan kunci publik yang privat-key-nya disimpan di luar VPS |
| Nama objek | `pg/{YYYY}/{MM}/hola-{YYYYMMDD}-{HHmm}.dump` |
| Verifikasi otomatis | Setelah upload, job memverifikasi ukuran objek > 0 dan menjalankan `pg_restore --list` pada file lokal untuk memastikan dump tidak korup. Gagal → alert Sentry + monitor backup tidak di-ping |
| Backup Redis | **Tidak dibutuhkan** untuk pemulihan bisnis (semua data rekonstruktibel). RDB/AOF container tetap ada untuk mempercepat restart. Tidak diupload offsite |
| Backup object storage | R2 bucket `hola-media` & `hola-private` memakai **versioning** + lifecycle. Tidak ada dump terpisah |
| RPO (Recovery Point Objective) | **≤ 24 jam** dengan backup harian |
| RTO (Recovery Time Objective) | **≤ 2 jam** untuk restore penuh ke VPS baru |

> **Catatan tentang RPO 24 jam:** untuk bisnis booking, kehilangan sampai satu hari transaksi
> berarti kehilangan data pembayaran. Karena itu ada dua peredam: (a) `payment_webhook_events`
> menyimpan payload mentah semua webhook sehingga pembayaran dapat direkonstruksi dari data
> Midtrans + laporan settlement gateway; (b) jika client menginginkan RPO lebih ketat, opsi
> peningkatan adalah WAL archiving berkelanjutan (`pgBackRest` atau `wal-g` ke R2) yang
> menurunkan RPO ke ~5 menit. Ini **peningkatan pasca-v1** dan dicatat di
> [17-NON-GOALS.md](17-NON-GOALS.md), bukan bagian v1.

### Prosedur restore (wajib terdokumentasi & pernah diuji)

```mermaid
flowchart TD
    A["Insiden: data rusak / VPS hilang"] --> B{"Jenis insiden?"}
    B -->|"Data logis rusak<br/>(mis. migration salah)"| C1["Restore ke database SEMENTARA<br/>hola_restore"]
    B -->|"VPS/disk hilang"| C2["Provision VPS baru<br/>+ pasang Dokploy"]

    C1 --> D1["Ambil dump terakhir dari R2"]
    C2 --> D2["Ambil dump terakhir dari R2"]

    D1 --> E1["pg_restore ke hola_restore"]
    E1 --> F1["Verifikasi: hitung baris kunci<br/>bookings, payments, journal_entries"]
    F1 --> G1["Tarik/perbaiki data yang perlu<br/>lalu apply ke database produksi"]
    G1 --> Z["Post-restore checklist"]

    D2 --> E2["Buat container postgres + redis<br/>volume baru"]
    E2 --> F2["pg_restore penuh ke database hola"]
    F2 --> G2["Deploy api, worker, web, admin<br/>dengan env dari secret store"]
    G2 --> H2["Arahkan DNS ke VPS baru"]
    H2 --> Z

    Z --> Z1["1. Restart worker → job cron didaftarkan ulang"]
    Z1 --> Z2["2. Jalankan gamification.rebuildLeaderboard<br/>(ZSET Redis kosong)"]
    Z2 --> Z3["3. Jalankan payment.reconcilePending<br/>(sinkron ulang status dari Midtrans)"]
    Z3 --> Z4["4. Jalankan booking.releaseExpiredHolds<br/>(bersihkan hold basi)"]
    Z4 --> Z5["5. Jalankan system.postJournalEntries<br/>(kosongkan outbox finance)"]
    Z5 --> Z6["6. Verifikasi /readyz, kirim 1 test notifikasi"]
    Z6 --> Z7["7. Catat insiden + waktu aktual RTO/RPO"]
```

Langkah restore konkret (runbook, disimpan juga di `docs/runbooks/restore.md` saat
implementasi dimulai):

1. `rclone copy r2:hola-backup/pg/2026/07/hola-20260727-0300.dump ./` — ambil dump.
2. `createdb hola_restore` lalu
   `pg_restore --dbname=hola_restore --jobs=4 --no-owner --no-privileges hola-*.dump`.
3. Verifikasi minimal (query dijalankan & hasilnya dicatat):
   `SELECT count(*) FROM bookings`, `SELECT count(*), sum(total_amount) FROM payments WHERE status='paid'`,
   `SELECT count(*) FROM journal_entries`, `SELECT max(created_at) FROM audit_logs`.
4. Untuk pemulihan penuh: hentikan traffic (Traefik maintenance page), rename database lama,
   rename `hola_restore` → `hola`, jalankan `pnpm db:migrate` (idempoten), naikkan container.
5. Jalankan **post-restore checklist** di diagram (Z1–Z7). Ini bagian wajib dari prosedur,
   bukan opsional — tanpa langkah 2, leaderboard akan kosong; tanpa langkah 3, status
   pembayaran bisa tertinggal.

### Uji restore (drill)

| Aturan | Detail |
|---|---|
| Frekuensi | **Bulanan**, otomatis lewat workflow `db-restore-drill.yml` |
| Isi drill | Ambil dump terbaru dari R2 → restore ke container PostgreSQL sementara di runner CI → jalankan query verifikasi → jalankan `pnpm db:migrate` untuk memastikan dump kompatibel dengan migration terbaru → laporkan durasi |
| Kriteria lulus | `pg_restore` selesai tanpa error, semua query verifikasi > 0, durasi tercatat |
| Drill manual (penuh, ke VPS staging) | **Kuartalan**, dilakukan manusia, hasilnya dicatat di `docs/runbooks/restore-drill-log.md` dengan tanggal, durasi aktual, dan masalah yang ditemukan |
| Aturan keras | Backup yang belum pernah diuji restore **dianggap tidak ada**. Jika drill bulanan gagal 2 kali berturut-turut, perbaikan backup menjadi prioritas di atas fitur. |

---

## 11. Setup Docker Compose Lokal

Tujuan: developer bisa `pnpm dev` setelah satu perintah, tanpa kredensial cloud.

### Layanan di `docker-compose.yml` (root repo)

| Service | Image | Port host | Volume | Catatan |
|---|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432:5432` | `hola_pgdata` | `POSTGRES_DB=hola`, `POSTGRES_USER=hola`, `POSTGRES_PASSWORD=hola` |
| `redis` | `redis:7-alpine` | `6379:6379` | `hola_redisdata` | command: `redis-server --appendonly yes --maxmemory-policy noeviction` |
| `minio` | `minio/minio` | `9000:9000`, `9001:9001` | `hola_miniodata` | console di 9001, root user/pass `hola`/`hola12345` |
| `minio-init` | `minio/mc` | — | — | Job sekali jalan: buat bucket `hola-media` (public read), `hola-private`, `hola-backup`; keluar setelah selesai |
| `mailpit` | `axllent/mailpit` | `1025:1025` (SMTP), `8025:8025` (UI) | — | Menangkap email lokal. `MAIL_TRANSPORT=smtp`, `SMTP_HOST=localhost`, `SMTP_PORT=1025` |

Yang **tidak** ada di compose lokal: `hola-api`, `hola-web`, `hola-admin`, `hola-worker`.
Aplikasi dijalankan langsung dengan `pnpm dev` di host supaya hot reload cepat. Compose hanya
menyediakan **dependensi**.

### Perintah pnpm yang wajib ada di root `package.json`

| Perintah | Isi |
|---|---|
| `pnpm dev:infra` | `docker compose up -d` |
| `pnpm dev:infra:down` | `docker compose down` |
| `pnpm dev:infra:reset` | `docker compose down -v && docker compose up -d` (hapus volume — hati-hati) |
| `pnpm db:generate` | `drizzle-kit generate` di `packages/db` |
| `pnpm db:migrate` | jalankan migration |
| `pnpm db:studio` | `drizzle-kit studio` |
| `pnpm db:seed` | seed data dev (lihat di bawah) |
| `pnpm dev` | `turbo run dev` (api + worker + web + admin paralel) |
| `pnpm dev:mobile` | `expo start` di `apps/mobile` |
| `pnpm typecheck` | `turbo run typecheck` |
| `pnpm lint` | `biome check .` |
| `pnpm lint:fix` | `biome check --write .` |
| `pnpm test` | `turbo run test` |
| `pnpm test:integration` | vitest dengan `TEST_DATABASE_URL` (butuh infra jalan) |
| `pnpm check:env` | Bandingkan `.env.example` ↔ schema zod env tiap app |
| `pnpm setup` | `pnpm install && pnpm dev:infra && pnpm db:migrate && pnpm db:seed` |

### Isi seed data dev (`pnpm db:seed`)

Deterministik (ID tetap, tanpa random) supaya test dan screenshot stabil:

| Data | Jumlah |
|---|---|
| `venues` | 1 (Hola Balikpapan, timezone `Asia/Makassar`) |
| `sports` | 3 (`padel`, `futsal`, `badminton`) |
| `courts` | 4 padel (`PDL-01`..`PDL-04`), 1 futsal, 2 badminton |
| `court_operating_hours` | 06:00–23:00 setiap hari untuk semua court |
| `price_rules` | padel: off-peak 06:00–16:00 Rp 150.000/jam; peak 16:00–23:00 Rp 250.000/jam; weekend peak Rp 300.000/jam |
| `users` | 1 admin (`admin@hola.test`), 1 staff, 1 tenant, 3 customer — semua password `Hola12345!` |
| `cafe_units` + `cafe_tenants` + `cafe_contracts` | 2 unit, 2 tenant, 2 kontrak aktif |
| `promos` | 1 kode manual `HOLA20` (20%, maks Rp 50.000), 1 auto promo happy hour |
| `events` | 1 open play published, 1 draft |
| `tournaments` | 1 knockout 8 peserta (bracket sudah digenerate), 1 round-robin 5 peserta |
| `point_rules` + `tiers` + `badges` | isi penuh sesuai [12](12-MODULE-GAMIFICATION.md) |
| `accounts` | chart of accounts penuh sesuai [14](14-MODULE-FINANCE.md) |
| `tutorials` | 3 tutorial padel (provider `youtube`) |
| `bookings` | 5 booking: 1 `pending_payment`, 2 `confirmed`, 1 `completed`, 1 `cancelled` |

### `.env.example` lokal (nilai yang cocok dengan compose)

```
APP_ENV=local
DATABASE_URL=postgres://hola:hola@localhost:5432/hola
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=hola
S3_SECRET_ACCESS_KEY=hola12345
MEDIA_PUBLIC_BASE_URL=http://localhost:9000/hola-media
MAIL_TRANSPORT=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
MIDTRANS_IS_PRODUCTION=false
```

### Cara menguji webhook Midtrans di lokal

Midtrans tidak bisa memanggil `localhost`. Dua jalur yang didukung:

1. **Tunnel** — `cloudflared tunnel --url http://localhost:4000`, lalu set URL notifikasi di
   dashboard Midtrans sandbox ke `https://<tunnel>/api/v1/webhooks/midtrans`.
2. **Simulator lokal** — endpoint khusus non-produksi `POST /api/v1/dev/simulate-webhook`
   (**hanya aktif jika `APP_ENV=local`**, dijaga guard yang gagal keras di produksi) yang
   membentuk payload webhook valid lengkap dengan `signature_key` yang benar, lalu memanggil
   handler yang sama. Ini yang dipakai di test integrasi.

---

## 12. Edge Cases (Infrastruktur)

| # | Kondisi | Perilaku yang diharapkan |
|---|---|---|
| E-1 | Redis mati total saat jam sibuk | API tetap melayani: rate limit fail-open, cache miss ke PostgreSQL, hold slot hanya mengandalkan `slot_claims` + partial unique index (tetap benar). Leaderboard membaca snapshot PostgreSQL dengan `stale: true`. Job tidak berjalan → menumpuk sebagai kondisi di PostgreSQL, dieksekusi saat Redis kembali. `/readyz` melaporkan `degraded`. |
| E-2 | PostgreSQL mati | API mengembalikan `503 SERVICE_UNAVAILABLE` untuk semua endpoint yang butuh data. Tidak ada fallback ke Redis. `/readyz` gagal. |
| E-3 | Worker mati > 5 menit | Monitor heartbeat memicu alert. Hold kedaluwarsa tetap dilepas oleh TTL Redis (lapis 1) tetapi baris `slot_claims` berstatus `held` tetap ada → ketersediaan tampak penuh. Mitigasi: query ketersediaan **wajib** memperlakukan `status='held' AND hold_expires_at < now()` sebagai tersedia (lihat [06 § 5](06-MODULE-BOOKING.md#5-pembacaan-ketersediaan--caching)) sehingga worker mati tidak memblokir penjualan. |
| E-4 | Webhook Midtrans datang saat API sedang deploy | Midtrans melakukan retry berjadwal. Selain itu J-06 `payment.reconcilePending` menemukan pembayaran yang tertinggal dalam ≤5 menit. Tidak ada pembayaran hilang. |
| E-5 | Deploy dengan migration yang gagal di tengah | Migration dijalankan dalam transaksi per file; kegagalan → container baru tidak naik, container lama tetap melayani. Perbaikan lewat migration baru. |
| E-6 | Disk VPS penuh | PostgreSQL berhenti menerima write → `503`. Pencegahan: monitor disk (alert di 80%), retensi backup lokal 7 hari, `system.pruneAuditLogs`, media di object storage (bukan disk VPS). |
| E-7 | Redis memori penuh dengan `noeviction` | Write gagal → error terlihat di Sentry. Cache & rate limit selalu ber-TTL sehingga tidak menumpuk; penyebab paling mungkin adalah `removeOnComplete` yang salah konfigurasi. |
| E-8 | Dua worker berjalan bersamaan (mis. deploy tumpang tindih) | Semua job idempoten → tidak ada kerusakan data, hanya pekerjaan ganda. |
| E-9 | Object storage tidak dapat dihubungi | Upload gagal dengan `502 STORAGE_UNAVAILABLE`; alur bisnis lain (booking, pembayaran) tidak terpengaruh karena media bukan jalur kritis. |
| E-10 | Perubahan zona waktu server | Semua timestamp `timestamptz` dan job cron memakai `Asia/Makassar` eksplisit, jadi tidak ada dampak. Container tetap diset `TZ=Asia/Makassar` agar log mudah dibaca. |
| E-11 | Sertifikat TLS gagal renew | Monitor expiry mengingatkan 14 hari sebelumnya. Traefik retry otomatis. |
| E-12 | Backup gagal beberapa hari tanpa disadari | Dead-man's switch (healthchecks.io) memicu alert jika J-30 tidak melakukan ping dalam 26 jam. |

---

## 13. Out of Scope (Infrastruktur v1)

- Kubernetes, service mesh, autoscaling berbasis metrik.
- Multi-region, read replica, atau failover PostgreSQL otomatis.
- WAL archiving / point-in-time recovery (kandidat peningkatan pasca-v1; lihat catatan RPO).
- Redis Cluster / Sentinel (satu instance cukup; kehilangan Redis tidak fatal secara desain).
- CDN kustom di depan Next.js selain Cloudflare proxy.
- Secret manager eksternal (Vault / Doppler). Secret dikelola di Dokploy + GitHub Secrets.
- Infrastructure as Code (Terraform/Pulumi). Provisioning VPS dilakukan manual dan
  didokumentasikan di runbook.
- Log aggregation terpusat (Loki/ELK). v1 memakai `docker logs` + Sentry. Kandidat pasca-v1.
- Blue/green atau canary deployment. Dokploy rolling restart cukup.
- Load testing terotomasi di CI.
