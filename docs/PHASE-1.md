# PHASE-1 — Working Document: Phase 0 (Fondasi) + Phase 1 (Core Revenue)

> Ini **working document sesi coding**, bukan dokumen kontrak. Konteks phase, risiko, dan
> estimasi tingkat tinggi ada di [ROADMAP.md](ROADMAP.md). Business rule ada di dokumen modul —
> dokumen ini hanya **menunjuk** ke sana.
>
> **Cara pakai:** kerjakan berurutan dari atas. Centang setelah task **selesai + tertest +
> ter-commit**, bukan setelah kodenya jalan sekali.

---

## Legenda

| Tanda | Arti |
|---|---|
| `0,5h` / `1h` | Estimasi hari kerja (h = hari). Tidak ada task > 1 hari — kalau ternyata lebih, ia salah dipecah |
| 🔒 | **Blocking** — beberapa task lain tidak bisa dimulai sebelum ini selesai |
| ⚙️ | **Prasyarat infrastruktur** — bukan kode fitur, tetapi memblokir jalur |
| 🔴 | **Gerbang DoD** — tidak boleh dilewati; menjadi bukti "Definition of Done" |
| ⛔ | **Terblokir/terpengaruh keputusan client** — id merujuk [ROADMAP § 8](ROADMAP.md#8-keputusan-client-yang-menghambat) |
| *acuan* | File & bagian `docs/` yang menjadi sumber kebenaran task ini |

**Aturan kerja yang berlaku untuk setiap task:**

1. Selesai = `pnpm typecheck && pnpm lint && pnpm test` hijau ([00 § 8](00-OVERVIEW.md#8-definisi-selesai-untuk-v1)).
2. Setiap `BR-*` yang diimplementasikan punya test yang **menyebut nomornya di judul test**
   ([16 BR-TT-01](16-CONVENTIONS.md#82-aturan-test)).
3. Menemukan `[BUTUH KEPUTUSAN CLIENT]` → pakai default tertulis + komentar
   `// [D-xx] default sementara — lihat docs/00-OVERVIEW.md § 6` ([16 AI-10](16-CONVENTIONS.md#10-aturan-untuk-ai-coding-assistant)).
4. Menemukan kontradiksi antar-dokumen → **laporkan**, jangan pilih sendiri
   ([16 AI-11](16-CONVENTIONS.md#10-aturan-untuk-ai-coding-assistant)).
5. Menambah kolom / endpoint / job berarti memperbarui `docs/` di PR yang sama
   ([16 AI-7/AI-8/AI-9](16-CONVENTIONS.md#10-aturan-untuk-ai-coding-assistant)).

---

## Ringkasan beban

| Phase | Blok | Task | Hari kerja (nominal) |
|---|---|---|---|
| **0** | A–O (15 blok) | 99 | **64,5** |
| **1** | A–M (13 blok) + buffer | 101 | **80,5** |
| | **Total sampai launch** | **200** | **145** |

Rentang phase di [ROADMAP § 2](ROADMAP.md#2-ringkasan-phase) memberi ±10% di sekitar angka
nominal ini.

---

# PHASE 0 — FONDASI

## F0.A — Repo, tooling, infra lokal · 4h

- [x] **F0-01** `0,5h` 🔒 — Inisialisasi repo, `pnpm-workspace.yaml`, struktur folder `apps/` + `packages/` + `docs/`, `.gitignore`, `.nvmrc` (Node 20+). *acuan:* [16 § 4.1](16-CONVENTIONS.md#41-root)
- [x] **F0-02** `0,5h` 🔒 — `tsconfig.base.json` dengan 10 opsi wajib (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noFallthroughCasesInSwitch`, …) + `tsconfig.json` turunan tiap workspace. *acuan:* [16 § 1.1](16-CONVENTIONS.md#11-konfigurasi)
- [x] **F0-03** `0,5h` 🔒 — `biome.json`: 10 aturan wajib aktif + format (indent 2, width 100, single quote, semicolon `asNeeded`, trailing comma `all`, import organizing). *acuan:* [16 § 2](16-CONVENTIONS.md#2-biome)
- [x] **F0-04** `0,5h` 🔒 — Override `noRestrictedImports` per app/package (4 baris tabel: web/admin/mobile, shared, api-client, api). *acuan:* [16 § 2 `noRestrictedImports` per app](16-CONVENTIONS.md#norestrictedimports-per-app)
- [x] **F0-05** `0,5h` 🔒 — `turbo.json` (pipeline `typecheck`/`lint`/`test`/`build`/`dev`) + seluruh 17 perintah root `package.json`. *acuan:* [02 § 11 Perintah pnpm](02-INFRASTRUCTURE.md#perintah-pnpm-yang-wajib-ada-di-root-packagejson)
- [x] **F0-06** `1h` ⚙️🔒 — `docker-compose.yml`: `postgres:16-alpine`, `redis:7-alpine` dengan **3 flag wajib** (`appendonly yes`, `appendfsync everysec`, `maxmemory-policy noeviction`), `rustfs`, `rustfs-init` (3 bucket), `mailpit`. *acuan:* [02 § 11](02-INFRASTRUCTURE.md#layanan-di-docker-composeyml-root-repo), [02 § 2](02-INFRASTRUCTURE.md#2-daftar-container--sumber-daya)
- [x] **F0-07** `0,5h` — `.env.example` lokal yang cocok dengan compose + bagian "cara mulai" di README. *acuan:* [02 § 11 `.env.example` lokal](02-INFRASTRUCTURE.md#envexample-lokal-nilai-yang-cocok-dengan-compose)

## F0.B — `packages/shared` · 8h

- [x] **F0-08** `1h` 🔒 — `constants/enums.ts`: **seluruh 53 enum** sebagai `as const` object + union type (bukan `enum` TypeScript). *acuan:* [03 § 3](03-DATA-MODEL.md#3-daftar-enum), [16 BR-TS-05](16-CONVENTIONS.md#12-aturan-tipe)
- [x] **F0-09** `0,5h` — `constants/error-codes.ts`: katalog `ERROR_CODE` lengkap. *acuan:* [04 § 5 Katalog error code](04-API-CONTRACT.md#katalog-error-code)
- [x] **F0-10** `0,5h` 🔒 — `constants/queues.ts`: `QUEUE.*` (6 queue) + `JOB.*` (37 job) sebagai union type. *acuan:* [02 § 5.1](02-INFRASTRUCTURE.md#51-queue), [02 § 5.2](02-INFRASTRUCTURE.md#52-tabel-job)
- [x] **F0-11** `0,5h` — `constants/limits.ts` + `constants/settings-keys.ts` + `constants/notification-templates.ts`. *acuan:* [16 § 4.3](16-CONVENTIONS.md#43-packagesshared)
- [x] **F0-12** `0,5h` 🔒 — `redis-keys.ts`: builder **pure** untuk 9 pola key, semuanya berprefiks `hola:{env}:`. Tidak boleh ada string key literal di service. *acuan:* [02 § 4.1](02-INFRASTRUCTURE.md#41-namespace-key), [16 BR-RD-02](16-CONVENTIONS.md#7-pola-redis-client)
- [x] **F0-13** `0,5h` — `format/money.ts` (`formatIDR`), `format/date.ts` (`formatWita`, `formatDateRange`), `format/duration.ts` + test
- [x] **F0-14** `0,5h` 🔒 — `utils/round.ts` `roundTo100()` *half-up* + test tabel kasus. *acuan:* [07 § 3.3 P10](07-MODULE-PAYMENT.md#33-detail-per-step), [08 § 8 Contoh](08-MODULE-PROMO.md#8-perhitungan-diskon)
- [x] **F0-15** `1h` 🔒 — `utils/slot-grid.ts`: `isSlotAligned()`, `buildSlotGrid()` — **pure**, menerima `now` sebagai parameter (BR-TS-10) + test. *acuan:* [03 § 8.2](03-DATA-MODEL.md#82-definisi-slot--grid)
- [x] **F0-16** `0,5h` — `utils/iso-week.ts` + test (dipakai `WEEKLY_STREAK` Phase 3, dibuat sekarang agar tidak ada helper waktu kedua)
- [x] **F0-17** `0,5h` — `env/`: schema zod env per app (api, web, admin, mobile) sesuai 4 tabel + script `pnpm check:env`. *acuan:* [02 § 8](02-INFRASTRUCTURE.md#8-daftar-environment-variable-per-app)
- [x] **F0-18** `0,5h` — `schemas/common.ts`: `paginationQuery` (cursor + offset), `idParam`, `money`, `isoDateTime`, `dateRange`. *acuan:* [04 § 6](04-API-CONTRACT.md#6-pagination-filter-sorting)
- [x] **F0-19** `0,5h` — `schemas/auth.ts` (register, login, refresh, password, otp) + `types/quote.ts` (bentuk `Quote`). *acuan:* [05](05-AUTH.md), [07 § 3.1](07-MODULE-PAYMENT.md#31-kontrak-fungsi)
- [x] **F0-20** `0,5h` 🔴 — Test tabel-driven: setiap konstanta enum **identik** dengan daftar di [03 § 3](03-DATA-MODEL.md#3-daftar-enum)
- [x] **F0-21** `0,5h` — Verifikasi larangan: `packages/shared` tidak mengimpor `fs`/`path`/`crypto` Node dan tidak menyentuh `process.env` (harus jalan di React Native). *acuan:* [01 § 3.6](01-ARCHITECTURE.md#36-packagesshared)

## F0.C — `packages/db` · 6h

- [x] **F0-22** `0,5h` — Konfigurasi drizzle-kit, koneksi Drizzle tunggal, mapping kolom uang `bigint → number` (BR-TS-07), helper UUID v7. *acuan:* [16 § 4.2](16-CONVENTIONS.md#42-appsapi), [03 § 2](03-DATA-MODEL.md#2-konvensi-tipe-data--kolom-standar)
- [x] **F0-23** `0,5h` 🔒 — Migration 0001: **53 tipe enum PostgreSQL**, nilainya identik dengan F0-08. *acuan:* [03 § 3](03-DATA-MODEL.md#3-daftar-enum)
- [x] **F0-24** `1h` 🔒 — Tabel identity: `users` (+ `ck_users_identifier`, UNIQUE email lowercase & phone), `refresh_tokens` (C-23 + index), `customer_profiles`. *acuan:* [03 § 5](03-DATA-MODEL.md#5-entitas-identity--access)
- [x] **F0-25** `1h` 🔒 — Tabel venue & lapangan: `venues`, `sports`, `courts` (+ C-24), `court_operating_hours` (UNIQUE `(court_id, day_of_week)`), `special_dates`, `addons`. *acuan:* [03 § 6](03-DATA-MODEL.md#6-entitas-venue-court-pricing)
- [x] **F0-26** `0,5h` — Tabel `price_rules` + 3 CHECK (`ck_price_rules_scope`, `_specific_date`, `_time_range`). *acuan:* [03 § 6 `price_rules`](03-DATA-MODEL.md#price_rules)
- [x] **F0-27** `0,5h` — Tabel sistem: `app_settings`, `audit_logs`, `idempotency_records` (C-22), `otp_challenges`, `password_reset_tokens`. *acuan:* [03 § 17](03-DATA-MODEL.md#17-entitas-notification-media-system)
- [x] **F0-28** `0,5h` — Tabel media & notifikasi: `media_files`, `notification_templates`, `notifications` (C-19), `push_tokens`. *acuan:* [03 § 17](03-DATA-MODEL.md#17-entitas-notification-media-system)
- [x] **F0-29** `0,5h` — Sequence kode manusia: `seq_booking_code`, `seq_payment_code`, `seq_refund_code`, `seq_invoice_number`, `seq_journal_entry`, `seq_employee_number`. *acuan:* [03 § 2 Format kode manusia](03-DATA-MODEL.md#format-kode-manusia)
- [x] **F0-30** `0,5h` — Index fondasi yang relevan Phase 0 (`idx_audit_logs_entity`, `idx_notifications_status_created`, index `refresh_tokens`). *acuan:* [03 § 18](03-DATA-MODEL.md#index-untuk-performa-minimal)
- [x] **F0-31** `0,5h` 🔴 — Test integrasi: enum TypeScript ≡ `pg_enum` di database uji (menangkap drift F0-08 vs F0-23)

## F0.D — `apps/api` core · 7h

- [x] **F0-32** `0,5h` 🔒 — Struktur `apps/api`, `env.ts` (validasi zod, **gagal keras saat boot**), `index.ts`, `app.ts` + ekspor `AppType`. *acuan:* [16 § 4.2](16-CONVENTIONS.md#42-appsapi), [02 § 8](02-INFRASTRUCTURE.md#8-daftar-environment-variable-per-app)
- [x] **F0-33** `0,5h` 🔒 — `config/db.ts`, `config/redis.ts` (**dua koneksi terpisah**: umum + BullMQ), helper `safeRedis(op, fallback)` dengan log `warn` + metrik `redis_degraded_total`. *acuan:* [16 BR-RD-01/BR-RD-03](16-CONVENTIONS.md#7-pola-redis-client)
- [x] **F0-34** `0,5h` — `config/logger.ts` pino: field wajib per request & per job, **redaction 11 kunci** + `config/sentry.ts` (error yang *diharapkan* tidak dikirim). *acuan:* [02 § 9](02-INFRASTRUCTURE.md#9-observability)
- [x] **F0-35** `1h` 🔒 — `lib/errors.ts`: kelas `AppError` + factory per `ERROR_CODE` + `UniqueViolationError` (membawa nama constraint) + `middleware/error-handler.ts` sebagai **satu-satunya** tempat error → response. *acuan:* [04 § 5](04-API-CONTRACT.md#5-format-error), [16 BR-SV-22](16-CONVENTIONS.md#53-bentuk-repository)
- [x] **F0-36** `0,5h` — `lib/response.ts` (envelope `{data}`/`{error}` + header standar) + `lib/pagination.ts` (cursor encode/decode, offset). *acuan:* [04 § 4](04-API-CONTRACT.md#4-format-response-sukses), [04 § 6](04-API-CONTRACT.md#6-pagination-filter-sorting)
- [x] **F0-37** `1h` 🔒 — `lib/transaction.ts` (`withTransaction` + callback `afterCommit` untuk enqueue) + `lib/codes.ts` (generator kode dari sequence, **di dalam** transaksi) + `lib/time.ts` (WITA, tanggal bisnis, grid). *acuan:* [16 BR-SV-13/BR-SV-14](16-CONVENTIONS.md#52-bentuk-service)
- [x] **F0-38** `0,5h` — `middleware/request-id.ts` (ULID + header `X-Request-Id`) + `middleware/logger.ts`
- [x] **F0-39** `1h` — `middleware/rate-limit.ts`: fixed window via Lua `EVALSHA`, **12 bucket**, identifier user/ip, **fail-open** + metrik + header `Retry-After`. *acuan:* [02 § 4.5](02-INFRASTRUCTURE.md#45-konfigurasi-rate-limit), [16 BR-RD-08](16-CONVENTIONS.md#7-pola-redis-client)
- [x] **F0-40** `0,5h` — `middleware/idempotency.ts`: Redis fast path 24 jam + `idempotency_records` (C-22) sebagai jaminan durabel + header `X-Idempotent-Replay`. *acuan:* [04 § 8](04-API-CONTRACT.md#8-idempotency--concurrency)
- [x] **F0-41** `0,5h` — `GET /healthz`, `GET /readyz` (cek PG + Redis, laporkan `degraded`), `GET /healthz/worker`, `GET /internal/metrics` (header `X-Internal-Token`). *acuan:* [02 § 2](02-INFRASTRUCTURE.md#2-daftar-container--sumber-daya), [02 § 9](02-INFRASTRUCTURE.md#9-observability)
- [x] **F0-42** `0,5h` — `GET /config/public`: `midtrans_client_key`, `server_time`, `min_supported_mobile_version`, timezone, teks kebijakan, flag fitur. *acuan:* [04 § 9.2](04-API-CONTRACT.md#92-konfigurasi-publik)

## F0.E — Auth & RBAC · 11h

- [x] **F0-43** `0,5h` — Hashing argon2id (`memoryCost=19456`, `timeCost=2`, `parallelism=1`) + `PASSWORD_PEPPER` + validasi password (≥ 8, bukan 10.000 terlemah, bukan email/nama). *acuan:* [05 § 8 Password](05-AUTH.md#password)
- [x] **F0-44** `0,5h` — `POST /auth/register` (hanya membuat role `customer`, respons **anti-enumerasi** untuk email yang sudah ada). *acuan:* [05 § 8](05-AUTH.md#8-registrasi--login)
- [x] **F0-45** `1h` — `POST /auth/login` + `users.failed_login_count`, `locked_until` (10 gagal → kunci 15 menit), progressive delay 1/2/4/8 s, notifikasi email saat lockout. *acuan:* [05 § 8 Brute force](05-AUTH.md#brute-force--lockout)
- [x] **F0-46** `1h` 🔒 — Penerbitan refresh token: 32 byte acak → base64url, simpan `token_hash` SHA-256, `family_id`, cookie `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth` (web) atau body (mobile). *acuan:* [05 § 4 Refresh token](05-AUTH.md#refresh-token-opaque)
- [x] **F0-47** `1h` 🔒 — `POST /auth/refresh`: rotasi wajib (T-3) + **deteksi reuse** (T-4: cabut seluruh `family_id` + `token_version + 1`) + batas 10 sesi aktif (T-5). *acuan:* [05 § 5](05-AUTH.md#5-siklus-hidup-token)
- [x] **F0-48** `0,5h` — `POST /auth/logout`, `/logout-all`, `GET /auth/sessions`, `DELETE /auth/sessions/{id}` + denylist `jti` di Redis (best-effort, fail-open)
- [x] **F0-49** `1h` — `POST /auth/password/forgot` (selalu `200`), `/reset` (token 32 byte, TTL 1 jam, sekali pakai, cabut semua sesi), `/change` (butuh password lama, sisakan sesi saat ini), `/email/verify/request`, `/email/verify`
- [x] **F0-50** `1h` 🔒 — `middleware/authenticate.ts` sesuai flowchart: verifikasi JWT → denylist `jti` (fail-open) → user context (cache Redis 60 s, miss → PostgreSQL) → cek `users.status` → cek `token_version`. *acuan:* [05 § 4 Verifikasi access token](05-AUTH.md#verifikasi-access-token-middleware-authenticate)
- [x] **F0-51** `0,5h` 🔒 — `middleware/require-role.ts` + allowlist route publik + **pemeriksaan saat boot** yang membuat aplikasi gagal start bila ada route tanpa guard dan tanpa allowlist. *acuan:* [16 BR-SV-03](16-CONVENTIONS.md#51-bentuk-route)
- [x] **F0-52** `0,5h` — Helper otorisasi kepemilikan: pola `findByIdForUser(tx, id, userId)` vs `findByIdAdmin(tx, id)`, filter **di WHERE** bukan di JS, `404` untuk customer / `403` untuk staff. *acuan:* [05 § 7](05-AUTH.md#7-otorisasi-berbasis-kepemilikan)
- [x] **F0-53** `0,5h` — Pola serializer per role (`viewer: { role, userId }`) + mekanisme field-level filtering (`◐`) yang akan dipakai seluruh modul. *acuan:* [05 § 7 Field-level filtering](05-AUTH.md#field-level-filtering-)
- [x] **F0-54** `0,5h` ⛔ D-04 — Endpoint OTP (`/auth/otp/request`, `/auth/otp/verify`) bertipe lengkap tetapi mengembalikan `403 FEATURE_DISABLED`, + tabel `otp_challenges`. *acuan:* [05 § 8 OTP](05-AUTH.md#otp)
- [x] **F0-55** `1h` — Modul `admin/users`: list, create (staff/admin/tenant), patch role/status (**wajib** menaikkan `token_version`, A-2), `POST /admin/users/{id}/revoke-sessions` + penulis `audit_logs` yang dipakai seluruh modul. *acuan:* [05 § 6.14](05-AUTH.md#614-sistem--media), [05 § 9 S-11](05-AUTH.md#9-keamanan-tambahan)
- [ ] **F0-56** `1,5h` 🔴 — Test auth: T-1…T-12, A-1…A-15, dan **RBAC tabel-driven** untuk seluruh endpoint Phase 0. *acuan:* [05 § 5](05-AUTH.md#5-siklus-hidup-token), [05 § 10](05-AUTH.md#10-edge-cases), [16 BR-TT-12](16-CONVENTIONS.md#82-aturan-test)

## F0.F — BullMQ, notifikasi, mail · 4,5h

- [x] **F0-57** `1h` ⚙️🔒 — `config/queues.ts` (6 producer, dibagikan lewat `ctx.queues`), `worker.ts` (registrasi seluruh `Worker` + `upsertJobScheduler` dengan `jobId` tetap + `tz: 'Asia/Makassar'`), graceful shutdown `SIGTERM` maks 30 detik. *acuan:* [16 § 6.1](16-CONVENTIONS.md#61-struktur), [02 § 5.3](02-INFRASTRUCTURE.md#53-ketahanan-job-terhadap-kehilangan-redis)
- [x] **F0-58** `0,5h` 🔴 — Test: konstanta `JOB.*` ≡ job yang benar-benar terdaftar di `jobs/index.ts` (BR-BQ-03)
- [x] **F0-59** `0,5h` — Provider mail: port `MailAdapter` + implementasi `resend` / `smtp` / `console`. *acuan:* [02 § 7](02-INFRASTRUCTURE.md#7-notifikasi), [16 § 4.2 `providers/`](16-CONVENTIONS.md#42-appsapi)
- [x] **F0-60** `1h` — Modul `notifications`: `notification_templates`, penulisan baris `inapp` sinkron untuk setiap kanal, **dedupe wajib** C-19, endpoint inbox (`GET /me/notifications`, `/read`, `/read-all`), quiet hours 22:00–07:00 untuk non-transaksional. *acuan:* [02 § 7 Aturan notifikasi](02-INFRASTRUCTURE.md#aturan-notifikasi)
- [x] **F0-61** `0,5h` — J-25 `notification.sendEmail` + J-36 `notification.retryStuckNotifications` (sweeper resmi). *acuan:* [02 § 5.2](02-INFRASTRUCTURE.md#52-tabel-job), [02 § 5.3](02-INFRASTRUCTURE.md#53-ketahanan-job-terhadap-kehilangan-redis)
- [x] **F0-62** `0,5h` — J-31 `system.cleanupExpiredTokens` (cron 04:00 WITA)
- [x] **F0-63** `0,5h` — `bullboard.ts` + basic auth + IP allowlist (ia bisa melihat payload job, S-8). *acuan:* [05 § 9 S-8](05-AUTH.md#9-keamanan-tambahan)

## F0.G — `packages/api-client` · 1,5h

- [x] **F0-64** `0,5h` — `createHolaClient({ baseUrl, getAccessToken, onUnauthorized })` + `import type { AppType }` (type-only, dijaga `verbatimModuleSyntax`) + pemetaan response error → `HolaApiError`. *acuan:* [01 § 3.7](01-ARCHITECTURE.md#37-packagesapi-client)
- [x] **F0-65** `1h` 🔴 — Refresh **single-flight** (T-12) + test: 3 request paralel yang `401` hanya memicu **satu** `POST /auth/refresh`; tanpa ini deteksi reuse memicu false positive (RK-0-03)

## F0.H — Media & object storage · 2h

- [ ] **F0-66** `0,5h` ⚙️ — `config/storage.ts` (klien S3, `S3_FORCE_PATH_STYLE` untuk RustFS) + pemeriksaan keberadaan 3 bucket saat boot. *acuan:* [02 § 6](02-INFRASTRUCTURE.md#6-object-storage)
- [ ] **F0-67** `1h` — `POST /media/presign` + `POST /media/{id}/confirm` (HEAD object, verifikasi mime & ukuran) + `GET`/`DELETE /media/{id}`, allowlist mime & batas ukuran per `kind`, RBAC per `kind`. *acuan:* [02 § 6 Alur upload](02-INFRASTRUCTURE.md#alur-upload-presigned), [05 § 6.14](05-AUTH.md#614-sistem--media)
- [ ] **F0-68** `0,5h` — J-32 `system.cleanupOrphanUploads` (`pending` > 24 jam)

## F0.I — `apps/web` shell · 2,5h

- [ ] **F0-69** `0,5h` — Scaffold Next.js App Router, layout, styling dasar, security headers S-4 (CSP, nosniff, Referrer-Policy, X-Frame-Options). *acuan:* [16 § 4.4](16-CONVENTIONS.md#44-appsweb--appsadmin), [05 § 9](05-AUTH.md#9-keamanan-tambahan)
- [ ] **F0-70** `0,5h` — `lib/api-client.ts`, `lib/auth.ts` (access token **hanya di memori**, refresh via cookie saat reload — S-5), `lib/query-client.ts`
- [ ] **F0-71** `1h` — Halaman `login`, `daftar`, `lupa-password`, `reset-password`, `verifikasi-email` memakai zod schema yang **sama** dengan API (A-09)
- [ ] **F0-72** `0,5h` — Sentry web + upload source map saat build, `release` = git SHA

## F0.J — `apps/admin` shell · 3h

- [ ] **F0-73** `0,5h` — Scaffold + layout + navigasi yang berubah per role (`admin` / `staff` / `tenant`). *acuan:* [01 § 3.3](01-ARCHITECTURE.md#33-appsadmin--nextjs-app-router-back-office)
- [ ] **F0-74** `0,5h` — Halaman login + guard rute per role (UX saja; keamanan tetap di API — [05 § 1](05-AUTH.md#1-prinsip))
- [ ] **F0-75** `1h` 🔒 — Komponen tabel data generik yang dipakai seluruh modul admin: offset pagination, filter, sort, pencarian `q`, keadaan kosong/error. *acuan:* [04 § 6.2](04-API-CONTRACT.md#62-offset-untuk-tabel-admin)
- [ ] **F0-76** `0,5h` — Halaman `app_settings` (`GET /admin/settings`, `PUT /admin/settings/{key}`) + `audit_logs`
- [ ] **F0-77** `0,5h` — Sentry admin + source map

## F0.K — CI · 2h

- [ ] **F0-78** `1h` ⚙️🔒 — `ci.yml`: `pnpm install --frozen-lockfile` → `typecheck` → `lint` (`biome ci`) → `test` → `build`, dengan **service container** postgres + redis untuk test integrasi. *acuan:* [02 § 3 GitHub Actions](02-INFRASTRUCTURE.md#github-actions--workflow-yang-ada)
- [ ] **F0-79** `0,5h` 🔴 — Job `guard-db-boundary` (`grep -R` pola terlarang di `apps/*/src`) **dan buktikan gagal** dengan commit percobaan di branch throwaway (DoD-0-03). *acuan:* [01 § 2](01-ARCHITECTURE.md#2-aturan-keras-semua-akses-database-lewat-appsapi)
- [ ] **F0-80** `0,5h` 🔴 — Job `check:env` **dan buktikan gagal** saat satu kunci dihapus dari `.env.example` (DoD-0-04)

## F0.L — Deploy · 4,5h

- [ ] **F0-81** `1h` ⚙️ ⛔ K-02 — Provisioning VPS: Docker, Dokploy, firewall, swap, monitor disk (alert di 80% — E-6)
- [ ] **F0-82** `1h` ⚙️ — `Dockerfile` untuk `apps/api` (multi-stage; container worker memakai image yang sama dengan `CMD ["node","dist/worker.js"]`), `apps/web`, `apps/admin`. *acuan:* [02 § 2](02-INFRASTRUCTURE.md#2-daftar-container--sumber-daya)
- [ ] **F0-83** `1h` ⚙️ ⛔ K-01 — Traefik: routing 6 host, TLS Let's Encrypt, HSTS `max-age=31536000; includeSubDomains`. *acuan:* [02 § 1 Domain & routing](02-INFRASTRUCTURE.md#domain--routing)
- [ ] **F0-84** `0,5h` ⚙️ — Env & secret di Dokploy per container + **release step** `pnpm db:migrate` (sekali per deploy, **bukan** di `CMD`). *acuan:* [02 § 3 Aturan deployment](02-INFRASTRUCTURE.md#aturan-deployment)
- [ ] **F0-85** `0,5h` ⚙️ — `deploy.yml`: trigger `workflow_run` setelah CI hijau, 4 webhook, urutan `api → worker → web → admin`
- [ ] **F0-86** `0,5h` 🔴 — Deploy pertama ke produksi + verifikasi `/healthz`, `/readyz`, dan `readyz = degraded` saat container redis dimatikan lalu dihidupkan lagi (DoD-0-08)

## F0.M — Backup & restore · 3,5h

- [ ] **F0-87** `1h` ⚙️ — Container `hola-backup` (`postgresql-client` + `rclone`), kredensial R2, bucket `hola-backup` + lifecycle rule (30 harian + 12 bulanan). *acuan:* [02 § 10 Strategi backup](02-INFRASTRUCTURE.md#strategi-backup)
- [ ] **F0-88** `0,5h` — J-30 `system.backupDatabase`: `pg_dump --format=custom --compress=9`, verifikasi `pg_restore --list`, upload dengan nama deterministik, ping dead-man's switch setelah sukses
- [ ] **F0-89** `0,5h` — Runbook `docs/runbooks/restore.md`: 5 langkah konkret + **post-restore checklist Z1–Z7**. *acuan:* [02 § 10 Prosedur restore](02-INFRASTRUCTURE.md#prosedur-restore-wajib-terdokumentasi--pernah-diuji)
- [ ] **F0-90** `1h` 🔴 — **JALANKAN DRILL RESTORE SUNGGUHAN**: ambil dump dari R2 → `createdb` → `pg_restore` → 4 query verifikasi → `pnpm db:migrate` di atasnya → catat durasi aktual & masalah di `docs/runbooks/restore-drill-log.md` (DoD-0-10). Backup yang belum diuji **dianggap tidak ada**
- [ ] **F0-91** `0,5h` — `db-restore-drill.yml`: `schedule` bulanan + `workflow_dispatch`, kriteria lulus tercatat

## F0.N — Monitoring · 1,5h

- [ ] **F0-92** `0,5h` ⚙️ ⛔ D-08, K-13 — Uptime Kuma + **8 monitor wajib** + kanal alert yang benar-benar dibaca. *acuan:* [02 § 9 Monitor yang wajib ada](02-INFRASTRUCTURE.md#uptime-monitoring--butuh-keputusan-client-d-08)
- [ ] **F0-93** `0,5h` ⚙️ — healthchecks.io dead-man's switch: cron ringan tiap 5 menit + ping dari J-30 (grace 26 jam)
- [ ] **F0-94** `0,5h` 🔴 — Verifikasi Sentry menerima **3 event uji terpisah** (api, web, admin) dengan source map terbaca (DoD-0-11)

## F0.O — Seed & penutup Phase 0 · 3,5h

- [ ] **F0-95** `1h` — Seed bagian 1 (**deterministik**, ID tetap, tanpa random): venue, 3 sports, 7 courts, `court_operating_hours` 06:00–23:00, `price_rules` contoh, `addons`. *acuan:* [02 § 11 Isi seed data dev](02-INFRASTRUCTURE.md#isi-seed-data-dev-pnpm-dbseed)
- [ ] **F0-96** `0,5h` — Seed bagian 2: 6 user (4 role, password `Hola12345!`), `app_settings` default, `notification_templates`
- [ ] **F0-97** `0,5h` 🔴 — `git clone` → `pnpm setup` → `pnpm dev` di mesin/VM **bersih**, catat waktu (< 15 menit, DoD-0-01)
- [ ] **F0-98** `1h` 🔴 — Verifikasi **12 butir DoD Phase 0** + kumpulkan bukti (log, tangkapan layar, isi `restore-drill-log.md`). *acuan:* [ROADMAP § 3.1](ROADMAP.md#31-definition-of-done-phase-0-terukur-semuanya-wajib)
- [ ] **F0-99** `0,5h` — `docs/runbooks/deploy.md` + bagian pengembangan di README

> **Gerbang Phase 0 → Phase 1:** jangan mulai P1-01 sebelum **seluruh** 12 butir DoD Phase 0
> tercentang. Melanjutkan dengan backup yang belum diuji atau CI yang belum menegakkan batas
> arsitektur berarti membangun modul uang di atas fondasi yang belum terbukti.

---

# PHASE 1 — CORE REVENUE

## P1.A — Schema slice 2 · 4,5h

- [ ] **P1-01** `1h` 🔒 — Tabel `slot_claims` + **C-1 `uq_slot_claims_active`** (penjaga final anti double-booking) + C-2 (`ck_slot_claims_single_owner`, `ck_slot_claims_owner_matches_type`) + C-3 (`ck_slot_claims_hold_expiry`) + C-4 + 4 index pendukung. **Kolom `event_id` & `match_id` belum dibuat** — lihat [ROADMAP § 1.2](ROADMAP.md#12-evolusi-constraint-slot_claims-lintas-phase). *acuan:* [03 § 8.3](03-DATA-MODEL.md#83-tabel-slot_claims), [03 § 8.4](03-DATA-MODEL.md#84-constraint-inti-mekanisme)
- [ ] **P1-02** `0,5h` — Tabel `court_maintenances` + FK dari `slot_claims`. *acuan:* [03 § 6](03-DATA-MODEL.md#court_maintenances)
- [ ] **P1-03** `1h` 🔒 — Tabel `bookings` (+ `ck_bookings_customer_or_guest`, kolom `reschedule_count`/`reschedule_history`, 3 index), `booking_items` (UNIQUE `(booking_id, court_id, starts_at)`), `booking_addons`. *acuan:* [03 § 7](03-DATA-MODEL.md#7-entitas-booking)
- [ ] **P1-04** `1h` 🔒 — Tabel `payments` (C-5, C-7, kolom `needs_manual_review`, 4 index), `payment_webhook_events` (C-6), `refunds`. *acuan:* [03 § 9](03-DATA-MODEL.md#9-entitas-payment--refund)
- [ ] **P1-05** `0,5h` — Tabel `promos`, `promo_courts`, `promo_sports`, `promo_redemptions` (C-20). *acuan:* [03 § 10](03-DATA-MODEL.md#10-entitas-promo)
- [ ] **P1-06** `0,5h` — Tabel `finance_events` (outbox). **Belum ada pemroses** — J-28 dibuat Phase 2; baris menunggu berstatus `pending` (ROADMAP A-2). *acuan:* [03 § 16](03-DATA-MODEL.md#16-entitas-finance), [16 § 6.2](16-CONVENTIONS.md#62-pola-outbox)

## P1.B — `pricing/` — pipeline harga · 5,5h

- [ ] **P1-07** `0,5h` 🔒 — Tipe `QuoteInput` & `Quote` di `packages/shared/types/quote.ts`, `pipeline_version = 1`. *acuan:* [07 § 3.1](07-MODULE-PAYMENT.md#31-kontrak-fungsi)
- [ ] **P1-08** `0,5h` — **P0** normalisasi & validasi: konversi WITA, deduplikasi `(court_id, starts_at)`, validasi keberadaan payable, batas keras 8 slot / 10 addon, **tanpa `Date.now()`** (memakai `input.at`)
- [ ] **P1-09** `0,5h` — **P1** ekspansi line item per `kind` (`booking` → per slot; `event_registration` / `tournament_registration` → satu baris `fee`)
- [ ] **P1-10** `1,5h` 🔒 — **P2** resolusi `price_rules`: 5 kondisi cocok + penentuan tipe hari 4 tingkat + **tie-break 6 tingkat** + `422 PRICE_RULE_NOT_FOUND` (tidak ada harga default). *acuan:* [07 § 3.3 P2](07-MODULE-PAYMENT.md#33-detail-per-step)
- [ ] **P1-11** `0,5h` — **P3** proporsi durasi (`roundTo100`) + **P4** subtotal + **P5** addon (validasi `is_active`, quantity 1..20)
- [ ] **P1-12** `0,5h` ⛔ D-06, D-07 — **P6** tier = 0, **P8** pajak (`tax_rate` dibaca dari `app_settings`, default 0), **P9** `fee_amount` = 0, **P10** pembulatan & total (floor 0, `rounding_adjustment_amount`)
- [ ] **P1-13** `1h` 🔴 — Test `pricing/`: seluruh step P0–P10, seluruh tie-break P2, kedua contoh perhitungan, E-11, E-12 — **coverage wajib 100%**. *acuan:* [07 § 3.4](07-MODULE-PAYMENT.md#34-contoh-perhitungan-lengkap), [16 BR-TT-15](16-CONVENTIONS.md#82-aturan-test)
- [ ] **P1-14** `0,5h` — `GET /pricing/preview` + `POST /bookings/quote` (selalu `reserve_promo: false`, BR-P-06). *acuan:* [04 § 9.3](04-API-CONTRACT.md#93-katalog-lapangan--ketersediaan-publik), [04 § 9.4](04-API-CONTRACT.md#94-booking)

## P1.C — `slots/` — klaim slot · 5,5h

- [ ] **P1-15** `1h` 🔒 — `slots.claim()` langkah 1–4: validasi grid + jam operasional + `courts.status`, lapis 3 Redis `SET NX EX 600` (boleh gagal), `BEGIN`, `SELECT courts FOR SHARE`. *acuan:* [03 § 8.6](03-DATA-MODEL.md#86-prosedur-klaim-satu-fungsi-untuk-semua-pemakai)
- [ ] **P1-16** `1h` 🔒 — Langkah 5 **TAKEOVER** (lepas hold kedaluwarsa dalam transaksi yang sama — tanpa ini slot basi memblokir penjualan) + langkah 6 INSERT + pemetaan unique violation `uq_slot_claims_active` → `409 SLOT_ALREADY_CLAIMED` dengan `details` daftar slot bentrok. *acuan:* [06 BR-B-35](06-MODULE-BOOKING.md#43-aturan-hold)
- [ ] **P1-17** `0,5h` — Langkah 7–10: sisipkan baris owner + hubungkan FK, COMMIT, invalidasi cache **setelah** commit (kegagalan hanya `warn`)
- [ ] **P1-18** `0,5h` — `slots.release()` idempoten (`AND status IN ('held','confirmed')`) + hapus key hold Redis agar slot tidak tertahan sampai TTL. *acuan:* [03 § 8.7](03-DATA-MODEL.md#87-prosedur-pelepasan)
- [ ] **P1-19** `1h` — **Force release** (`force=true`, hanya `admin`, hanya menimpa `claim_type='booking'`): 6 efek berantai wajib dalam satu transaksi + body `{"confirm": true}` + `audit_logs`. *acuan:* [03 § 8.8](03-DATA-MODEL.md#88-force-release-hanya-admin)
- [ ] **P1-20** `1,5h` 🔴 — Test `slots/`: T-B-01…T-B-04, S-1…S-12, **setiap test race dijalankan dua kali — Redis hidup dan Redis dimatikan** (BR-B-30, BR-TT-04) — coverage 100%. *acuan:* [06 § 4.5](06-MODULE-BOOKING.md#45-test-yang-wajib-ada), [03 § 8.11](03-DATA-MODEL.md#811-edge-cases-slot-ownership)

## P1.D — Ketersediaan & cache · 3,5h

- [ ] **P1-21** `1h` 🔒 — `GET /courts/{id}/availability`: 8 langkah perhitungan, bentuk response persis, `unavailable_reason`, `meta.generated_at`. **Hold kedaluwarsa dihitung sebagai tersedia** (BR-B-35). *acuan:* [06 § 5.1](06-MODULE-BOOKING.md#51-cara-menghitung-ketersediaan), [03 § 8.9](03-DATA-MODEL.md#89-cara-membaca-ketersediaan-satu-query-untuk-semua)
- [ ] **P1-22** `0,5h` — Cache Redis TTL 60 s + header `X-Cache: HIT|MISS` + **validasi zod saat membaca cache** (bentuk berubah = perlakukan sebagai miss, BR-RD-11)
- [ ] **P1-23** `1h` 🔒 — **10 aturan invalidasi I-1…I-10**, termasuk penghapusan berpola prefiks memakai `SCAN COUNT 200` (bukan `KEYS`). *acuan:* [02 § 4.4](02-INFRASTRUCTURE.md#44-aturan-invalidasi-cache-ketersediaan)
- [ ] **P1-24** `0,5h` — `GET /availability` lintas court **ditunda ke Phase 2**; yang dibuat sekarang: `meta.warnings: [BEYOND_BOOKING_HORIZON]` (E-19) + batas rentang 14 hari (BR-B-47)
- [ ] **P1-25** `0,5h` 🔴 — Test: T-B-08, T-B-09, BR-B-41…B-47, dan kebenaran hasil saat Redis mati (BR-B-45)

## P1.E — `courts/` — API admin lapangan & harga · 3h

- [ ] **P1-26** `0,5h` — `POST`/`PATCH /courts` (+ `If-Match`; **tolak** ubah `slot_duration_minutes` bila ada klaim aktif `starts_at >= today` → `422 COURT_HAS_FUTURE_CLAIMS`, S-4). *acuan:* [04 § 9.15](04-API-CONTRACT.md#915-admin-court-harga-maintenance-sistem)
- [ ] **P1-27** `0,5h` — `PUT /courts/{id}/operating-hours` (ganti 7 baris sekaligus, invalidasi I-8) + `PUT /courts/{id}/photos`
- [ ] **P1-28** `0,5h` — `GET`/`POST`/`PATCH`/`DELETE /price-rules` (DELETE hanya bila belum pernah dipakai) + invalidasi I-7 (**semua** key `avail:*`)
- [ ] **P1-29** `0,5h` — `GET`/`POST`/`DELETE /special-dates` + invalidasi I-10
- [ ] **P1-30** `0,5h` — `POST /court-maintenances` (klaim `claim_type='maintenance'`, mode `direct`) + `/cancel`; `force=true` hanya `admin` (E-11)
- [ ] **P1-31** `0,5h` — `GET /slot-claims` read-only dengan filter (untuk kalender admin & diagnosis; **tidak ada** POST/DELETE)

## P1.F — `bookings/` · 6,5h

- [ ] **P1-32** `0,5h` — `booking-state.ts` **pure**: tabel transisi + penolakan 5 transisi terlarang + test. *acuan:* [06 § 8](06-MODULE-BOOKING.md#8-state-machine-status-booking)
- [ ] **P1-33** `0,5h` ⛔ D-01 — `booking-refund.ts` **pure**: `computeRefundAmount(booking, policy, now)` yang membaca `app_settings.refund_policy` (Opsi A/B/C) + test ketiga tier Opsi B. *acuan:* [06 § 7](06-MODULE-BOOKING.md#7-kebijakan-pembatalan--refund-butuh-keputusan-client)
- [ ] **P1-34** `1,5h` 🔒 — `POST /bookings`: validasi BR-B-01…B-11 → `pricing.computeQuote({ reserve_promo: true })` → `slots.claim({ mode: 'hold' })` → reservasi promo → simpan `quote_snapshot` — **satu transaksi**, `Idempotency-Key` wajib. *acuan:* [06 § 4.4](06-MODULE-BOOKING.md#44-alur-hold-end-to-end)
- [ ] **P1-35** `0,5h` — BR-B-14 (maks 3 `pending_payment` per customer) + BR-B-15 (maks 2 `confirmed` per tanggal) + field opsional `expected_total_amount` → `409` bila tidak cocok (E-13)
- [ ] **P1-36** `0,5h` — Booking oleh staff: `channel='admin'`/`walk_in`, guest (BR-B-11), mode klaim `direct` tanpa hold (BR-B-38), `checked_in_at = created_at` untuk walk-in (BR-B-86)
- [ ] **P1-37** `1h` — `POST /bookings/{id}/cancel`: BR-B-60…B-71 — pembuatan `refunds` (atau tidak, bila Rp 0), pelepasan klaim + reservasi promo, pembatalan J-03/J-04, notifikasi, `audit_logs` dengan `reason` wajib untuk staff
- [ ] **P1-38** `0,5h` — `POST /bookings/{id}/check-in` (jendela −30 menit s.d. `ends_at`, `force` khusus admin) + `/no-show`. *acuan:* [06 § 9](06-MODULE-BOOKING.md#9-check-in--no-show)
- [ ] **P1-39** `0,5h` — `GET /bookings` (filter + pencarian `q` atas kode/nama/telepon), `GET /bookings/{id}`, `GET /me/bookings`, `PATCH` catatan, `GET /bookings/{id}/receipt`
- [ ] **P1-40** `1h` 🔴 — Test `bookings/`: setiap `BR-B-*` dalam scope Phase 1 + edge case E-2, E-3, E-4, E-13, E-20, E-22

## P1.G — `promos/` dasar · 4,5h

- [ ] **P1-41** `0,5h` — `computeDiscount()` **pure** untuk `percent` (dengan `max_discount_amount`) & `fixed` + clamp ke `base` + `roundTo100` + test 7 kasus. *acuan:* [08 § 8](08-MODULE-PROMO.md#8-perhitungan-diskon)
- [ ] **P1-42** `1h` 🔒 — `promo.evaluate()`: V-1…V-8, V-15, V-16 dengan `reason_code` spesifik. **V-9…V-14 (court/sport/hari/jam/rate class), auto promo, dan stacking ditunda Phase 4.** *acuan:* [08 § 3](08-MODULE-PROMO.md#3-aturan-validasi-promo-eligibility)
- [ ] **P1-43** `1h` 🔒 — `promo.reserve()`: **`UPDATE promos SET quota_used = quota_used + 1 WHERE … AND (quota_total IS NULL OR quota_used < quota_total) RETURNING`** → insert `promo_redemptions` (`reserved_until = hold_expires_at`) → **baru** hitung kuota per user (urutan ini penting, BR-PR-33). Pola `SELECT → cek → UPDATE` **dilarang**. *acuan:* [08 § 5.1](08-MODULE-PROMO.md#51-mekanisme)
- [ ] **P1-44** `0,5h` — `promo.markApplied()` / `promo.release()` + J-09 `commerce.releaseExpiredPromoReservations` (repeat 60 s, `quota_used − 1` dalam transaksi yang sama) + refresh counter Redis dari `promos.quota_used` (BR-PR-36)
- [ ] **P1-45** `0,5h` — CRUD admin promo + `pause`/`activate`/`archive` + BR-PR-67 (field terkunci setelah `quota_used > 0`) + `POST /promos/validate` (tidak mereservasi, BR-PR-50)
- [ ] **P1-46** `1h` 🔴 — Test promo: T-PR-01…T-PR-07, T-PR-09, **race kuota dijalankan dengan & tanpa Redis** (DoD-1-08). *acuan:* [08 § 5.3](08-MODULE-PROMO.md#53-test-yang-wajib-ada)

## P1.H — `payments/` · 9h

- [ ] **P1-47** `0,5h` 🔒 — Port `PaymentProvider` (5 operasi) + `ManualProvider` (tidak memanggil API mana pun). *acuan:* [07 § 2 Kontrak port](07-MODULE-PAYMENT.md#kontrak-port-paymentprovider)
- [ ] **P1-48** `1h` 🔒 ⛔ K-04, K-05 — `MidtransProvider`: `createTransaction` (Snap), `getTransactionStatus`, `parseWebhook` (SHA-512 **timing-safe**, `gross_amount` dipakai apa adanya), `capabilities` dari `app_settings.refund_api_supported_methods`. *acuan:* [07 § 5.3](07-MODULE-PAYMENT.md#53-verifikasi-signature), [07 § 7.2](07-MODULE-PAYMENT.md#72-dukungan-refund-per-metode-pembayaran)
- [ ] **P1-49** `1h` 🔒 — `POST /payments`: BR-P-10…BR-P-19. Urutan **wajib**: INSERT `payments` **dulu**, baru panggil gateway (E-2). `item_details` dibangun dari `quote_snapshot.lines` termasuk baris diskon **negatif** agar totalnya sama dengan `gross_amount` (BR-P-16, BR-PR-55)
- [ ] **P1-50** `0,5h` — Total Rp 0 → **tidak** memanggil gateway; payment `provider='manual'`, `method='cash'`, `amount=0`, `status='paid'`, payable langsung dikonfirmasi (BR-P-18)
- [ ] **P1-51** `0,5h` 🔒 — `applyPaymentTransition()` **pure** (menolak transisi tidak sah, no-op untuk transisi ke status yang sama) + pemetaan 11 baris status Midtrans + `needs_manual_review` untuk `capture`+`challenge` + test. *acuan:* [07 § 4.3](07-MODULE-PAYMENT.md#43-state-machine-payment), [07 § 4.4](07-MODULE-PAYMENT.md#44-pemetaan-status-midtrans--payment_status)
- [ ] **P1-52** `1,5h` 🔒 — `payments.markPaid()` dalam **satu transaksi**: `payments → paid` (dengan `WHERE status='pending'`, BR-P-35), payable → `confirmed`, `slot_claims held → confirmed` (+ `hold_expires_at = NULL`), `promo_redemptions → applied`, `INSERT finance_events`. Enqueue notifikasi & job **setelah** commit. *acuan:* [07 BR-P-34](07-MODULE-PAYMENT.md#52-aturan-idempotency)
- [ ] **P1-53** `1h` 🔒 — Handler HTTP `POST /webhooks/midtrans`: verifikasi signature → bentuk `provider_event_id` → `INSERT payment_webhook_events ON CONFLICT DO NOTHING` → enqueue J-05 (`jobId = wh:midtrans:{eventId}`) → `200`. **< 1 detik, tanpa logika bisnis, tanpa panggilan jaringan keluar** (BR-P-38). *acuan:* [07 § 5.1](07-MODULE-PAYMENT.md#51-pembagian-tugas-yang-wajib), [04 § 10](04-API-CONTRACT.md#10-konvensi-webhook)
- [ ] **P1-54** `1h` 🔒 — J-05 `payment.processWebhook`: `SELECT … FOR UPDATE` → keluar bila `processed_at` terisi → cari payment → verifikasi `gross_amount` → transisi → `markPaid()`; tangani `unknown_order` (BR-P-36) dan `amount_mismatch` (BR-P-37) dengan alert, **tanpa** mengonfirmasi
- [ ] **P1-55** `0,5h` — `POST /payments/manual` (BR-P-20…BR-P-26, `Idempotency-Key` wajib, memakai fungsi `markPaid()` yang **sama**) + `POST /payments/{id}/cancel` + `/sync`
- [ ] **P1-56** `0,5h` ⚙️ — `POST /dev/simulate-webhook`: bentuk payload valid + `signature_key` benar, panggil handler yang sama; guard yang **gagal saat boot** bila `APP_ENV !== 'local'` (S-12). *acuan:* [02 § 11 Cara menguji webhook](02-INFRASTRUCTURE.md#cara-menguji-webhook-midtrans-di-lokal)
- [ ] **P1-57** `1h` 🔴 — Test payment: BR-P-30…BR-P-40, E-1…E-9, **kirim payload webhook identik 5× → tepat satu transisi, satu email, satu `finance_events`** (DoD-1-03)

## P1.I — Rekonsiliasi & refund · 4,5h

- [ ] **P1-58** `1h` — J-06 `payment.reconcilePending` (repeat 5 m): LIMIT 200 urut `created_at`, panggil status gateway, transisi hanya ke arah sah (BR-P-43), **plus perannya sebagai sweeper** J-07 dan sweeper `payment_webhook_events` yang `processed_at IS NULL` > 5 menit (E-19). *acuan:* [07 § 6.1](07-MODULE-PAYMENT.md#61-j-06-paymentreconcilepending-tiap-5-menit)
- [ ] **P1-59** `0,5h` — J-07 `payment.expireUnpaid` (delayed pada `expires_at`, `jobId = expire:{paymentId}`)
- [ ] **P1-60** `1h` 🔒 — **Jalur pemulihan E-6**: pembayaran masuk setelah booking `expired` → payment tetap `paid` → coba `slots.claim(mode:'direct')` → berhasil: `expired → confirmed` + `audit_logs action='booking.recovered_after_expiry'` + notifikasi; gagal: refund **100% tanpa potongan**, `approved` otomatis + notifikasi permintaan maaf. Ini **satu-satunya** jalur `expired → confirmed`. *acuan:* [06 § 11 E-6](06-MODULE-BOOKING.md#11-edge-cases)
- [ ] **P1-61** `1h` ⛔ K-10 — Modul `refunds`: pembuatan dari cancel & force release, `approve`/`reject` (admin), `mark-completed` (`manual_transfer`/`cash`), BR-P-50…BR-P-61. **Tanpa** `createRefund()` gateway ([ROADMAP A-4](ROADMAP.md#11-penyesuaian-terhadap-struktur-phase-wajib-dibaca))
- [ ] **P1-62** `0,5h` — J-08 `payment.processRefund` jalur manual: arahkan ke `channel='manual_transfer'`, buat tugas + notifikasi ke admin, status berhenti di `processing`
- [ ] **P1-63** `0,5h` 🔴 — Test: DoD-1-04 (webhook dimatikan → J-06 mengonfirmasi ≤ 5 menit), E-6 **kedua cabang**, E-7 (pembayaran dobel → refund otomatis)

## P1.J — Job booking & email transaksional · 4,5h

- [ ] **P1-64** `0,5h` — J-01 `booking.releaseExpiredHolds` (repeat 60 s, kondisional atas `status='held' AND hold_expires_at < now()`) + test idempotensi T-B-04
- [ ] **P1-65** `1h` — J-02 `booking.autoCompleteBookings` (repeat 15 m) **+ perannya sebagai sweeper resmi J-03 dan J-04** (mencari pekerjaan tertinggal dari kondisi PostgreSQL, bukan dari daftar job Redis). *acuan:* [02 § 5.3 Aturan sweeper](02-INFRASTRUCTURE.md#53-ketahanan-job-terhadap-kehilangan-redis)
- [ ] **P1-66** `0,5h` — J-03 `booking.sendBookingReminder` (delayed pada `starts_at − 2 jam`, `jobId = reminder:{bookingId}`)
- [ ] **P1-67** `0,5h` — J-04 `booking.markNoShow` (delayed pada `ends_at + 30 menit`, kondisional `checked_in_at IS NULL`)
- [ ] **P1-68** `1h` ⛔ K-09 — Template email transaksional: `booking.confirmed` + e-receipt, `booking.cancelled`, `booking.force_cancelled`, `booking.reminder_2h`, `payment.refund_completed` — semuanya menulis baris `inapp` juga
- [ ] **P1-69** `0,5h` — Penjadwalan & pembatalan job saat booking berubah status (BR-B-58, BR-B-68): reschedule/cancel me-remove `jobId` lama
- [ ] **P1-70** `0,5h` 🔴 — Test idempotensi setiap job Phase 1 (BR-TT-14): jalankan handler dua kali dengan input sama → state akhir identik, tidak ada baris ganda

## P1.K — `apps/web` (customer) · 9h

- [ ] **P1-71** `1h` ⛔ K-09 — Landing page: hero, daftar olahraga, lapangan unggulan, jam operasional, lokasi, kontak + metadata SEO, `sitemap.xml`, OG image. *acuan:* [01 § 3.2](01-ARCHITECTURE.md#32-appsweb--nextjs-app-router-customer)
- [ ] **P1-72** `0,5h` — Halaman daftar lapangan + detail lapangan (foto dari `media.hola.id`, jam operasional, harga per `rate_class`)
- [ ] **P1-73** `1,5h` 🔒 — Komponen **grid ketersediaan**: pemilih tanggal & lapangan, slot tersedia/terisi (disabled), `rate_class`, harga per slot, penanda `generated_at`, tarik-untuk-menyegarkan. *acuan:* [06 § 5.2](06-MODULE-BOOKING.md#52-bentuk-response)
- [ ] **P1-74** `1h` — Layar checkout: pilih 1..`max_slots_per_booking` slot, addon, input kode promo (`POST /promos/validate`), **ringkasan quote persis dari response** — tanpa satu pun perkalian harga di client (BR-B-12)
- [ ] **P1-75** `1h` 🔒 — `POST /bookings` dengan `Idempotency-Key` (UUID v7 dari client) + **countdown hold** yang dihitung dari `hold_expires_at` dikurangi offset `server_time` (E-23) + penanganan `409 SLOT_ALREADY_CLAIMED` (pesan "slot baru saja diambil" + muat ulang ketersediaan, E-3)
- [ ] **P1-76** `1h` 🔒 — Integrasi Snap (popup) + halaman status pembayaran + polling `GET /payments/{id}` tiap 3 detik maks 5 menit + konfirmasi ulang harga saat `meta.warnings` memuat `PROMO_QUOTA_EXHAUSTED` (E-10) atau `PRICE_CHANGED` (E-13)
- [ ] **P1-77** `1h` — `/me/bookings` (mendatang & riwayat, cursor pagination) + detail booking (termasuk `hold_expires_at` untuk melanjutkan checkout, E-4) + tampilan e-receipt
- [ ] **P1-78** `1h` ⛔ D-01, K-08 — Alur pembatalan: tampilkan `refund_estimate_amount` + `policy_applied` + teks `app_settings.cancellation_policy_text` **sebelum** konfirmasi (BR-B-71); teks kebijakan juga tampil di halaman checkout
- [ ] **P1-79** `0,5h` — Halaman error/kosong/offline + penanganan `401` (refresh single-flight sudah di `api-client`) + daftar booking `pending_payment` saat customer terkena BR-B-14 (E-20)
- [ ] **P1-80** `0,5h` 🔴 — Test komponen non-trivial: grid ketersediaan, countdown hold, form checkout dengan validasi kondisional (BR-TT-16)

## P1.L — `apps/admin` (minimal, cukup operasional harian) · 9h

- [ ] **P1-81** `1h` — Dashboard "hari ini": booking hari ini per lapangan, pembayaran masuk, hold aktif, booking `pending_payment` yang perlu ditindaklanjuti
- [ ] **P1-82** `1h` — Kalender slot per lapangan dari `GET /slot-claims` (booking / maintenance dibedakan; event & match menyusul otomatis di Phase 2 & 4 tanpa perubahan UI)
- [ ] **P1-83** `1h` ⛔ K-06 — CRUD lapangan + jam operasional + foto (presigned upload, kompresi gambar di client sebelum upload — [02 § 6](02-INFRASTRUCTURE.md#6-object-storage))
- [ ] **P1-84** `1h` ⛔ K-07 — CRUD `price_rules` + pratinjau harga (`GET /pricing/preview`) + **peringatan slot tanpa rule yang cocok** (mencegah `PRICE_RULE_NOT_FOUND` di produksi, E-11)
- [ ] **P1-85** `0,5h` — Blokir lapangan (maintenance) + pembatalannya + penanganan `409` dengan daftar booking bentrok dan pilihan force release (E-11)
- [ ] **P1-86** `1h` — Tabel booking: filter status/tanggal/lapangan/kanal + pencarian `q` + halaman detail booking (items, addon, payments, riwayat)
- [ ] **P1-87** `1h` 🔒 — **Booking manual**: `channel='admin'`/`walk_in`, customer terdaftar atau guest (`guest_name` + `guest_phone`), + pencatatan pembayaran tunai (`POST /payments/manual` dengan `Idempotency-Key`). Ini kanal pendapatan hari pertama
- [ ] **P1-88** `0,5h` — Aksi check-in / no-show / pembatalan dengan `reason` wajib
- [ ] **P1-89** `1h` — CRUD voucher: `percent`/`fixed`, `max_discount_amount` (wajib bila `value_percent > 25`, BR-PR-01), `quota_total`, `quota_per_user`, `valid_from`/`valid_until`, `min_transaction_amount` + statistik `quota_used / quota_total`
- [ ] **P1-90** `0,5h` — Daftar pembayaran + `sync` + daftar refund + `approve`/`reject`/`mark-completed` (unggah bukti transfer)
- [ ] **P1-91** `0,5h` — Halaman customer sederhana (daftar + riwayat booking) sebagai pendahulu CRM Phase 2

## P1.M — Go-live · 7,5h

- [ ] **P1-92** `1h` ⚙️🔴 ⛔ K-04, K-05 — Onboarding **Midtrans produksi**: key, notification URL, konfirmasi metode yang aktif, konfirmasi dukungan refund API per metode, **uji tiap metode aktif dengan nominal kecil**
- [ ] **P1-93** `0,5h` ⚙️ ⛔ K-06, K-07, K-11, K-12 — Isi data produksi: seluruh lapangan, jam operasional, `price_rules` **dari daftar harga client**, `addons`, nilai `app_settings` (DoD-1-11)
- [ ] **P1-94** `0,5h` ⚙️ ⛔ K-13 — Metrik & alert Phase 1 (`slot_claim_conflicts_total`, `payment_webhook_total{result}`, `payment_reconcile_fixed_total`, `bull_queue_depth`, `redis_degraded_total`) + **uji alert** dengan mematikan API 3 menit (DoD-1-10)
- [ ] **P1-95** `1h` — Runbook `docs/runbooks/operasional-harian.md`: cari booking, catat pembayaran tunai, batalkan, setujui refund, dan **apa yang dilakukan saat customer mengeluh "sudah bayar tapi belum terkonfirmasi"** (jawabannya: `POST /payments/{id}/sync`)
- [ ] **P1-96** `1h` — Sesi pelatihan staff memakai data staging + perbaikan dari umpan baliknya (DoD-1-12)
- [ ] **P1-97** `1,5h` — UAT bersama client atas 12 skenario utama (booking normal, promo, gagal bayar, hold habis, walk-in tunai, pembatalan berbayar, maintenance bentrok, dst.) + perbaikan
- [ ] **P1-98** `1h` 🔴 — **DoD-1-01**: transaksi nyata pertama end-to-end di produksi, disaksikan client
- [ ] **P1-99** `0,5h` 🔴 — Verifikasi **12 butir DoD Phase 1** + kumpulkan bukti. *acuan:* [ROADMAP § 4.1](ROADMAP.md#41-definition-of-done-phase-1-terukur)
- [ ] **P1-100** `0,5h` — Pemutakhiran `docs/` untuk aturan yang berubah selama implementasi + catat utang teknis Phase 1 yang dibawa ke Phase 2 (reschedule, refund gateway, `GET /availability`)

## P1.N — Buffer · 4h

- [ ] **P1-101** `4h` — Buffer Phase 1: bug tak terduga, perbaikan dari UAT, kegagalan integrasi gateway, penyesuaian kecil. **Kalau buffer ini habis sebelum blok P1.K selesai, pilih tuas kompresi dari [ROADMAP § 9.4](ROADMAP.md#94-kalau-harus-lebih-cepat-tuas-yang-tersedia) sekarang** — jangan menunggu minggu terakhir

---

## Checklist gerbang — jangan lewati

### Sebelum menulis baris kode pertama

- [ ] Sudah membaca [00-OVERVIEW.md](00-OVERVIEW.md), [01-ARCHITECTURE.md](01-ARCHITECTURE.md), [03-DATA-MODEL.md](03-DATA-MODEL.md), [16-CONVENTIONS.md](16-CONVENTIONS.md)
- [ ] Jawaban client atas **K-01** (domain) dan **K-02** (akun infrastruktur) sudah diterima — tanpa keduanya Phase 0 berhenti di F0-81

### Sebelum P1-01 (gerbang Phase 0 → 1)

- [ ] 12 butir DoD Phase 0 tercentang, dengan bukti
- [ ] `docs/runbooks/restore-drill-log.md` berisi **satu entri drill yang benar-benar dijalankan**
- [ ] Pertanyaan client untuk Phase 1 sudah dikirim: **D-01, D-06, D-07, K-04, K-06, K-07, K-08, K-09, K-10, K-11, K-13**

### Sebelum P1-98 (gerbang launch)

- [ ] 12 butir DoD Phase 1 tercentang
- [ ] Coverage 100% pada `pricing/`, `slots/`, dan seluruh `*-policy.ts`/`*-state.ts` ditegakkan CI
- [ ] Test race dijalankan **dengan Redis mati** dan hijau
- [ ] Backup harian produksi berjalan; drill bulanan otomatis sudah lulus minimal sekali
- [ ] Alert masuk ke kanal yang benar-benar dibaca (diuji, bukan diasumsikan)
- [ ] Staff sudah dilatih dan runbook operasional ada di tangan mereka

---

## Utang teknis yang sengaja dibawa keluar Phase 1

Dicatat di sini agar tidak hilang; masing-masing sudah masuk rencana Phase 2 di
[ROADMAP § 5](ROADMAP.md#5-phase-2--operasional).

| # | Utang | Ke | Alasan |
|---|---|---|---|
| U-1 | Reschedule booking (BR-B-50…B-59) | Phase 2 | Bukan prasyarat menerima uang; sementara staff batalkan + buat ulang |
| U-2 | `createRefund()` via API gateway | Phase 2 | Mayoritas metode launch memakai `manual_transfer` ([ROADMAP A-4](ROADMAP.md#11-penyesuaian-terhadap-struktur-phase-wajib-dibaca)) |
| U-3 | `GET /availability` lintas court | Phase 2 | Alur "pilih lapangan → lihat jam" sudah cukup untuk launch |
| U-4 | `finance_events` menumpuk `pending` tanpa pemroses | Phase 2 | Disengaja ([ROADMAP A-2](ROADMAP.md#11-penyesuaian-terhadap-struktur-phase-wajib-dibaca)); J-28 memprosesnya beserta backfill |
| U-5 | `slot_claims` belum punya kolom `event_id`/`match_id` | Phase 2 & 4 | Migration bertahap dengan pola `NOT VALID` + `VALIDATE` ([ROADMAP § 1.2](ROADMAP.md#12-evolusi-constraint-slot_claims-lintas-phase)) |
| U-6 | Promo: V-9…V-14, auto promo, `free_slot`, stacking | Phase 4 | Voucher dasar cukup untuk promo launching |
| U-7 | Staging environment terpisah penuh | Phase 1–2 | Phase 0/1 memakai database `hola_staging` di VPS yang sama |
