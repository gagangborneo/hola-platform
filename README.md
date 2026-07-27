# Hola Platform

Monorepo sistem manajemen fasilitas olahraga Hola: booking lapangan, pembayaran online,
tenant cafe, event, turnamen, gamification, dan back-office.

Seluruh keputusan teknis dan business rule hidup di [`docs/`](docs/). Kode mengikuti dokumen —
kalau keduanya berbeda, **dokumen yang menang** dan kodenya diperbaiki.

| Mulai dari | Isi |
|---|---|
| [docs/00-OVERVIEW.md](docs/00-OVERVIEW.md) | Ruang lingkup v1, daftar modul, definisi selesai |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Urutan phase, Definition of Done, risiko |
| [docs/PHASE-1.md](docs/PHASE-1.md) | Daftar task Phase 0 & 1 (dicentang saat selesai) |
| [docs/16-CONVENTIONS.md](docs/16-CONVENTIONS.md) | Konvensi kode — **baca sebelum menulis file pertama** |

---

## Cara mulai

### Prasyarat

| Alat | Versi | Catatan |
|---|---|---|
| Node.js | ≥ 20 (lihat [`.nvmrc`](.nvmrc)) | `nvm use` |
| pnpm | 11.x | `corepack enable && corepack use pnpm@11.9.0` |
| Docker + Compose v2 | — | Menjalankan postgres, redis, minio, mailpit |

Tidak ada kredensial cloud yang dibutuhkan untuk pengembangan lokal.

### Satu perintah

```bash
git clone <repo> hola-platform && cd hola-platform
cp .env.example .env
pnpm setup     # install → naikkan infra → migration → seed
pnpm dev       # api + worker + web + admin paralel
```

Target: dari `git clone` sampai `pnpm dev` berhasil di mesin bersih **< 15 menit**
(DoD-0-01, [ROADMAP § 3.1](docs/ROADMAP.md#31-definition-of-done-phase-0-terukur-semuanya-wajib)).

### Layanan lokal setelah `pnpm dev:infra`

| Layanan | Alamat | Kredensial |
|---|---|---|
| PostgreSQL | `localhost:5432` | `hola` / `hola`, database `hola` (+ `hola_test`) |
| Redis | `localhost:6379` | — |
| MinIO (S3) | `localhost:9000` | `hola` / `hola12345` |
| MinIO Console | http://localhost:9001 | `hola` / `hola12345` |
| Mailpit (SMTP) | `localhost:1025` | — |
| Mailpit (UI) | http://localhost:8025 | — |

Bucket dibuat otomatis oleh service `minio-init`: `hola-media` (public read),
`hola-private`, `hola-backup`.

> **Kalau port bentrok dengan layanan lain di mesin Anda**, override di `.env` — jangan ubah
> `docker-compose.yml`. Tersedia: `MINIO_PORT`, `MINIO_CONSOLE_PORT`, `MAILPIT_SMTP_PORT`,
> `MAILPIT_UI_PORT`. Kalau port MinIO diubah, sesuaikan juga `S3_ENDPOINT` dan
> `MEDIA_PUBLIC_BASE_URL`; kalau port Mailpit diubah, sesuaikan `SMTP_PORT`.

---

## Perintah

| Perintah | Isi |
|---|---|
| `pnpm setup` | `install` → `dev:infra` → `db:migrate` → `db:seed` |
| `pnpm dev` | Jalankan semua app (turbo) |
| `pnpm dev:mobile` | `expo start` di `apps/mobile` (Phase 3) |
| `pnpm dev:infra` | `docker compose up -d` |
| `pnpm dev:infra:down` | `docker compose down` |
| `pnpm dev:infra:reset` | `docker compose down -v && docker compose up -d` — **menghapus volume** |
| `pnpm db:generate` | Buat file migration dari schema Drizzle |
| `pnpm db:migrate` | Jalankan migration |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed` | Seed data dev (deterministik) |
| `pnpm build` | `turbo run build` |
| `pnpm typecheck` | `turbo run typecheck` |
| `pnpm lint` | `biome check .` |
| `pnpm lint:fix` | `biome check --write .` |
| `pnpm test` | Unit test |
| `pnpm test:integration` | Test integrasi (butuh infra jalan) |
| `pnpm check:env` | Bandingkan `.env.example` ↔ schema zod tiap app |

---

## Aturan yang ditegakkan mesin, bukan imbauan

| Aturan | Penegak |
|---|---|
| Semua akses database lewat `apps/api` | `biome.json` (`noRestrictedImports`) + job CI `guard-db-boundary` + dependensi tidak dicantumkan di `package.json` frontend |
| `packages/shared` harus jalan di React Native | `noRestrictedImports` (`node:*`) + `noProcessEnv` |
| `packages/api-client` tidak menarik runtime `apps/api` | `verbatimModuleSyntax: true` |
| Env tidak boleh drift dari schema | `pnpm check:env` di CI |
| Aplikasi gagal boot bila ada route tanpa guard RBAC | Pemeriksaan saat boot di `app.ts` |

Selesai untuk sebuah task berarti `pnpm typecheck && pnpm lint && pnpm test` hijau —
lihat [00 § 8](docs/00-OVERVIEW.md#8-definisi-selesai-untuk-v1).

---

## Status

Phase 0 (Fondasi) sedang berjalan. Progres per task: [docs/PHASE-1.md](docs/PHASE-1.md).
