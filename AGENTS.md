# AGENTS.md

Panduan ini berlaku untuk seluruh repository `hola-platform`. Tujuannya adalah membantu
coding agent melanjutkan pekerjaan tanpa menggeser kontrak produk, merusak perubahan lokal,
atau menandai task selesai sebelum benar-benar terverifikasi.

## 1. Sumber Kebenaran dan Urutan Membaca

Sebelum mengubah kode:

1. Jalankan `git status --short` dan baca diff yang belum di-commit. Perubahan yang sudah ada
   adalah milik user atau agent sebelumnya; jangan membuang atau menimpanya.
2. Baca task aktif di `docs/PHASE-1.md`, termasuk acuan yang ditunjuk task tersebut.
3. Baca dokumen domain yang relevan:
   - `docs/00-OVERVIEW.md` untuk prinsip, keputusan client, dan Definition of Done.
   - `docs/01-ARCHITECTURE.md` untuk batas app/package dan alur dependensi.
   - `docs/02-INFRASTRUCTURE.md` untuk Redis, BullMQ, env, observability, dan deployment.
   - `docs/03-DATA-MODEL.md` untuk schema, enum, constraint, dan index.
   - `docs/04-API-CONTRACT.md` untuk endpoint, response, error, pagination, dan idempotency.
   - `docs/05-AUTH.md` untuk autentikasi, RBAC, ownership, dan field filtering.
   - Dokumen modul `06`–`15` sesuai domain yang sedang dikerjakan.
   - `docs/16-CONVENTIONS.md` untuk TypeScript, struktur folder, service/repository, Redis,
     BullMQ, testing, dan aturan AI.
   - `docs/17-NON-GOALS.md` sebelum menambah kemampuan baru.
4. `docs/PHASE-1.md` adalah checklist kerja, bukan pengganti business rule. Bila checklist
   ringkas dan dokumen modul lebih rinci, implementasikan kontrak modul yang relevan.
5. Jika dua dokumen bertentangan, laporkan kontradiksinya. Jangan memilih atau mengubah
   kontrak secara diam-diam.

## 2. Aturan Arsitektur yang Tidak Boleh Dilanggar

- Stack sudah final: pnpm monorepo, TypeScript, Hono, Drizzle, PostgreSQL, Redis, BullMQ,
  Next.js, Expo, Vitest, Biome, Docker, dan Dokploy.
- Semua akses database aplikasi berjalan melalui `apps/api`.
- `apps/web`, `apps/admin`, dan `apps/mobile` tidak boleh mengimpor `@hola/db`,
  `drizzle-orm`, driver database, atau membuka koneksi database.
- `packages/db` hanya berisi schema, migration, relasi, seed, koneksi tooling, dan tipe hasil
  inferensi. Business rule dan query kompleks hidup di repository `apps/api`.
- `packages/shared` harus aman untuk React Native: tanpa Node-only API, `process.env`,
  database, Redis, atau I/O.
- Alur dependensi API adalah `routes -> service -> repository -> database`.
  - Route: validasi, ambil context, panggil satu service, serialisasi.
  - Service: business rule, transaksi, orkestrasi lintas modul, efek setelah commit.
  - Repository: query Drizzle dan penerjemahan error constraint.
- Route tidak boleh mengimpor repository atau `@hola/db`.
- Service adalah fungsi dan menerima dependency context sebagai parameter pertama; jangan
  menambah DI container, base service, atau generic repository.
- Harga hanya dihitung di modul `pricing`, klaim slot hanya melalui modul `slots`, dan poin
  hanya melalui modul `gamification`.
- Waktu bisnis harus disuntikkan sebagai `now: Date`. Jangan membaca jam baru di tengah
  service atau fungsi business rule.

## 3. Kontrak Database, API, dan Job

- Jangan menambah atau mengubah kolom sebelum memperbarui `docs/03-DATA-MODEL.md`.
- Migration produksi bersifat forward-only. Jangan mengedit migration yang sudah masuk
  `main`; buat migration baru.
- Jangan menambah endpoint sebelum memperbarui:
  - katalog endpoint di `docs/04-API-CONTRACT.md`; dan
  - RBAC matrix di `docs/05-AUTH.md`.
- Semua route wajib memiliki guard role eksplisit atau tercatat di public-route allowlist.
- Error bisnis dilempar sebagai `AppError`. Hanya global error handler yang mengubah error
  menjadi response HTTP.
- Jangan menulis literal untuk error code, queue, job, notification template, settings key,
  atau Redis key. Pakai konstanta/builder dari `@hola/shared`.
- Jangan menambah job BullMQ sebelum menambahkannya ke `docs/02-INFRASTRUCTURE.md`, termasuk
  retry dan mekanisme idempotency.
- Enqueue dilakukan setelah transaksi commit melalui `afterCommit`. Pekerjaan yang tidak
  boleh hilang memakai outbox PostgreSQL sesuai kontrak.

## 4. Redis dan Konsistensi

- Redis boleh gagal atau kehilangan seluruh datanya tanpa merusak kebenaran bisnis.
- Gunakan dua koneksi: koneksi umum dan koneksi khusus BullMQ.
- Semua operasi Redis pada jalur request dibungkus `safeRedis` dan memiliki fallback.
- Semua key dibuat melalui builder `@hola/shared`; jangan menyusun key literal di service.
- Semua `SET` memiliki TTL eksplisit, kecuali ZSET leaderboard yang dikontrak khusus.
- Rate limiter selalu fail-open dan operasi multi-langkahnya menggunakan Lua `EVALSHA`.
- Redis bukan jaminan idempotency durabel; PostgreSQL tetap menjadi sumber kebenaran.
- Sebelum menambah penggunaan Redis, jelaskan apa yang terjadi jika key tersebut hilang.

## 5. TypeScript dan Gaya Kode

- Ikuti strict TypeScript di `tsconfig.base.json`.
- `any`, TypeScript `enum`, non-null assertion, floating promise, dan business rule di route
  dilarang.
- Type assertion hanya untuk hasil parsing yang sudah divalidasi atau interop library yang
  tidak memiliki tipe memadai; beri komentar mengapa aman.
- Tipe domain diturunkan dari schema Zod atau model Drizzle, bukan diduplikasi manual.
- Semua fungsi yang diekspor memiliki return type eksplisit.
- Nilai uang adalah integer `number` dalam rupiah, bukan float, desimal, atau string.
- Gunakan nama file dan struktur folder dari `docs/16-CONVENTIONS.md`.
- Jangan menambah dependency npm tanpa alasan teknis yang jelas dan pemeriksaan dampak pada
  lockfile/peer dependency.

## 6. Testing dan Definition of Done

- Setiap `BR-*` yang diimplementasikan wajib memiliki test yang menyebut nomor rule pada
  judul test.
- Setiap edge case `E-*` memiliki test atau komentar eksplisit bahwa perilakunya diterima.
- Gunakan unit test untuk fungsi pure dan integration test dengan PostgreSQL/Redis nyata
  untuk transaksi, constraint, race condition, Lua, dan durability.
- Jangan mock PostgreSQL pada integration test. Provider eksternal harus berada di balik
  adapter dan boleh memakai implementasi test.
- Test harus deterministik: waktu dan ID fixture disuntikkan; jangan memakai random atau jam
  nyata untuk business rule.
- Sebelum menyatakan task selesai, jalankan dari root:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm check:env
```

- Jika task menyentuh database/Redis atau file `*.integration.test.ts`, jalankan juga:

```bash
TEST_DATABASE_URL=postgres://hola:hola@localhost:5432/hola_test \
TEST_REDIS_URL=redis://localhost:6379 \
pnpm test:integration
```

- Lakukan smoke test endpoint yang berubah bila server dapat dijalankan secara lokal.
  Gunakan port alternatif bila port default sedang dipakai, dan hentikan proses test setelah
  selesai agar tidak meninggalkan server yatim.

## 7. Dokumentasi, Checklist, dan Git

- Perubahan business rule, schema, endpoint, env, job, atau kontrak publik harus memperbarui
  dokumen terkait dalam perubahan yang sama.
- Keputusan bertanda `[BUTUH KEPUTUSAN CLIENT]` memakai default tertulis dan komentar:

```ts
// [D-xx] default sementara — lihat docs/00-OVERVIEW.md § 6
```

- Centang task di `docs/PHASE-1.md` hanya setelah implementasi lengkap, test relevan hijau,
  dan perubahan sudah di-commit.
- Commit menggunakan Conventional Commits dan satu tujuan yang jelas.
- Jangan push, force-push, rebase, menghapus branch, atau mengubah history tanpa permintaan
  eksplisit user.
- Jangan melakukan destructive Git command seperti `git reset --hard` atau
  `git checkout --` pada perubahan user.
- Jangan memasukkan `.env`, credential, token, dump database, log lokal, cache, atau artefak
  build ke Git.

## 8. Keadaan Lokal dan Keamanan

- Gunakan `.env.example` sebagai kontrak key. Nilai rahasia hidup di `.env` lokal atau secret
  manager dan tidak boleh dicetak ke output.
- Validasi env harus gagal saat boot, bukan saat request pertama.
- Logger menggunakan redaction wajib dan tidak boleh memakai `console` di `apps/api`.
- Expected error seperti validasi, 401, 403, 404, dan konflik 409 tidak dikirim ke Sentry.
- Jangan membuka endpoint metrics, Bull Board, atau data internal tanpa proteksi yang
  ditetapkan PRD.

## 9. Kontradiksi PRD yang Sudah Diketahui

Jangan menyelesaikan poin berikut secara diam-diam:

1. Alur idempotency menyatakan `scope` mencegah key dari operasi berbeda bertabrakan, tetapi
   schema saat ini menetapkan UNIQUE hanya pada `idempotency_records.key`, bukan
   `(scope, key)`. Implementasi saat ini menolak replay lintas-scope agar tidak pernah
   mengembalikan response dari operasi lain.
2. Heartbeat worker menggunakan TTL 90 detik di kontrak infrastruktur dan konstanta shared,
   sementara satu bagian kontrak API menyebut sehat bila berumur kurang dari 120 detik.
   Implementasi saat ini mengikuti TTL infrastruktur 90 detik.

Jika keputusan final dibuat, perbarui dokumen sumber, schema/konstanta, implementasi, dan test
secara bersamaan.
