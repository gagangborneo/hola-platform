# P1.K — `apps/web` (customer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun pengalaman customer `apps/web` — landing, daftar & detail lapangan, grid ketersediaan, checkout, hold, pembayaran Snap, riwayat booking, dan pembatalan — di atas design system Tailwind v4 yang diturunkan dari `references/web`.

**Architecture:** Halaman publik adalah Server Component ber-ISR yang mengambil data lewat `server-api.ts` ke `API_BASE_URL_INTERNAL`; halaman transaksional adalah Client Component dengan TanStack Query di atas `apiClient` yang sudah ada. Tiga endpoint baca baru dan satu pelengkap field ditambahkan lebih dulu di `apps/api` karena `apps/web` tidak boleh mengarang data. Seluruh angka harga dirender apa adanya dari response API.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript 7 · Tailwind CSS v4 · shadcn/ui (subset) · TanStack Query v5 · Hono RPC client · Vitest + Testing Library · Drizzle ORM (sisi API)

**Spec:** [docs/superpowers/specs/2026-08-08-apps-web-customer-design.md](../specs/2026-08-08-apps-web-customer-design.md)

## Global Constraints

Berlaku untuk **setiap** task di bawah ini.

- **Import wajib memakai ekstensi berkas**: `import { authStore } from '../lib/auth.ts'`, `from './courts.repository.ts'`. Repo memakai `verbatimModuleSyntax`; import tanpa ekstensi gagal typecheck.
- **Gaya kode Biome**: kutip tunggal, kutip ganda di JSX, tanpa titik koma, trailing comma `all`, indentasi 2 spasi, lebar baris 100. Jalankan `pnpm lint:fix` sebelum commit.
- **Tipe kembalian eksplisit** pada setiap fungsi yang diekspor, termasuk komponen React (`: ReactNode`).
- **Tidak ada aritmetika harga di klien** (BR-B-12). Angka rupiah hanya diformat, tidak pernah dijumlah, dikali, atau dibulatkan di `apps/web`.
- **Token warna** (nilai persis): `--primary: #1565c0`, `--primary-foreground: #ffffff`, `--accent: #96f535`, `--accent-foreground: #0a2a00`, `--background: #f4f8ff`, `--foreground: #0a1f5c`, `--card: #ffffff`, `--secondary: #e3edff`, `--muted: #dde8ff`, `--muted-foreground: #4a6fa5`, `--destructive: #d4183d`, `--border: rgba(21, 101, 192, 0.13)`, `--input-background: #eaf0ff`, `--ring: #1565c0`, `--radius: 0.875rem`.
- **Font**: Fredoka untuk heading, DM Sans untuk body, dimuat lewat `next/font/google`. **Dilarang** memakai `@import url('https://fonts.googleapis.com/...')` — CSP `font-src 'self' data:` akan memblokirnya.
- **Tidak ada mode gelap.** Jangan salin blok `.dark` dari referensi. Deklarasi `@custom-variant dark (&:is(.dark *))` tetap ditulis agar kelas `dark:` bawaan shadcn terkompilasi.
- **Dilarang menyalin `references/web/src/app/App.tsx`** atau data `COURTS` di dalamnya, dan dilarang menampilkan rating, jumlah ulasan, jumlah booking, atau testimoni — tidak ada sumber datanya dan tidak boleh dikarang.
- **Slug rute berbahasa Indonesia**, mengikuti `/login`, `/daftar`, `/lupa-password` yang sudah ada.
- **Environment test**: `vitest.config.ts` di `apps/web` memakai `environment: 'node'` sebagai default; hanya `src/components/**` yang dialihkan ke `happy-dom`. Test lama `src/lib/auth.test.ts` dan `src/lib/security-headers.test.ts` harus tetap hijau.
- **Perintah verifikasi** dijalankan dari root repo. `package.json` root tidak punya blok `scripts`, jadi pakai bentuk langsung berikut — bukan alias root:

  | Tujuan | Perintah |
  |---|---|
  | Test web | `pnpm --filter @hola/web test` |
  | Typecheck web | `pnpm --filter @hola/web typecheck` |
  | ~~Build web~~ | **TERHALANG** — lihat catatan di bawah |
  | Test API | `pnpm --filter @hola/api test` |
  | Integration API | `pnpm --filter @hola/api test:integration` |
  | Lint | `pnpm exec biome check .` (perbaiki: `pnpm exec biome check --write <berkas>`) |
  | Infra lokal | `docker compose up -d` |
  | Validasi env | `node scripts/check-env.ts` |
  | Migrasi DB | `pnpm --filter @hola/db run migrate` |

  Jalankan `biome check --write` **hanya pada berkas yang kamu sentuh**; menjalankannya pada seluruh repo akan memformat ulang `references/web/` yang vendored.
- **`next build` sedang rusak di seluruh repo — bukan disebabkan pekerjaan P1.K.** Sudah diverifikasi gagal pada commit `aaf9df7`, yaitu sebelum baris kode web pertama fase ini ditulis, dan gagal juga di `apps/admin` pada `/_not-found` (halaman bawaan Next tanpa kode aplikasi). Gejala: `TypeError: Cannot read properties of null (reading 'useState')` saat prerender, menunjuk `src/app/providers.tsx`. Sudah dikesampingkan sebagai penyebab: React ganda (hanya satu salinan 19.2.8), pembungkus Sentry, dan `"type": "module"`. **Jangan pakai `pnpm --filter @hola/web build` sebagai gerbang verifikasi** — ia akan selalu gagal dan menyesatkan. Pakai `typecheck` + `test`, dan verifikasi visual lewat `pnpm --filter @hola/web dev` (dev server jalan normal). Masalah ini harus diselesaikan sebelum P1.M go-live dan dilacak terpisah dari P1.K.
- **Integration test API** butuh infra hidup: `docker compose up -d` sebelum `pnpm --filter @hola/api test:integration`.
- **Satu pengecualian urutan**: Task 16 Step 1–4 (`RequireSession`) harus dikerjakan sebelum Task 13 Step 8. Selain itu, task dikerjakan berurutan 1 → 18.

---

## File Structure

### `apps/api` — prasyarat (Fase A)

| Berkas | Tanggung jawab |
|---|---|
| `src/modules/courts/sports.repository.ts` (baru) | Query baca tabel `sports` |
| `src/modules/courts/sports.routes.ts` (baru) | `GET /sports` publik |
| `src/modules/courts/courts.repository.ts` (ubah) | Tambah `listPublicCourts`, `findCourtDetail` |
| `src/modules/courts/courts.serializer.ts` (ubah) | Tambah `serializeCourtDetail`, `serializeSport` |
| `src/modules/courts/courts.service.ts` (ubah) | Tambah `listCourts`, `getCourtDetail` |
| `src/modules/courts/courts.routes.ts` (ubah) | Tambah `GET /courts`, `GET /courts/:id` |
| `src/modules/courts/courts.schema.ts` (ubah) | Tambah `courtsQuerySchema` |
| `src/modules/bookings/bookings.service.ts` (ubah) | `getBookingDetail` mengembalikan pratinjau pembatalan |
| `src/modules/bookings/bookings.routes.ts` (ubah) | `serializeDetail` memuat tiga field baru |
| `src/modules/system/public-config.service.ts` (ubah) | `require_contiguous_slots` ke config publik |
| `src/app.ts` (ubah) | Pasang `sportsRoutes` |

### `apps/web` — fondasi (Fase B)

| Berkas | Tanggung jawab |
|---|---|
| `postcss.config.mjs` (baru) | Plugin `@tailwindcss/postcss` |
| `src/styles/theme.css` (baru) | Token desain + `@theme inline` |
| `src/styles/globals.css` (ganti isi) | `@import 'tailwindcss'` + `@layer base` |
| `src/lib/fonts.ts` (baru) | Fredoka + DM Sans via `next/font/google` |
| `src/lib/cn.ts` (baru) | `clsx` + `tailwind-merge` |
| `src/components/ui/*.tsx` (baru, 11 berkas) | Subset shadcn |
| `vitest.config.ts` (baru) | Environment per-glob |
| `src/lib/security-headers.ts` (ubah) | Origin Midtrans di CSP |

### `apps/web` — layar (Fase C–F)

| Berkas | Tanggung jawab |
|---|---|
| `src/lib/server-api.ts` | Fetch server-side endpoint publik |
| `src/lib/format.ts` | Format rupiah, tanggal, jam (tanpa aritmetika harga) |
| `src/lib/public-config.ts` | Ambil & cache `/config/public`, hitung offset waktu |
| `src/components/layout/SiteHeader.tsx`, `SiteFooter.tsx` | Kerangka halaman publik |
| `src/components/court/CourtCard.tsx` | Kartu lapangan |
| `src/components/booking/AvailabilityGrid.tsx` | Grid slot + date strip |
| `src/components/booking/availability-labels.ts` | Pemetaan `unavailable_reason` → label |
| `src/components/booking/CheckoutForm.tsx` | Pilih addon, promo, ringkasan quote |
| `src/components/booking/checkout-validation.ts` | Validasi kondisional slot |
| `src/components/booking/HoldCountdown.tsx` | Countdown ber-offset server |
| `src/components/booking/hold-countdown.ts` | Perhitungan sisa waktu murni |
| `src/components/booking/PaymentStatus.tsx` | Polling pembayaran |
| `src/components/account/BookingList.tsx`, `CancelDialog.tsx` | Riwayat & pembatalan |
| `src/components/common/RequireSession.tsx` | Penjaga rute klien |

Berkas `*.ts` tanpa JSX (`availability-labels.ts`, `checkout-validation.ts`, `hold-countdown.ts`) sengaja dipisah dari komponennya supaya logika yang diuji tidak memerlukan render.

---

# Fase A — Prasyarat `apps/api`

### Task 1: `GET /sports` publik

**Files:**
- Create: `apps/api/src/modules/courts/sports.repository.ts`
- Create: `apps/api/src/modules/courts/sports.routes.ts`
- Modify: `apps/api/src/modules/courts/courts.serializer.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `docs/04-API-CONTRACT.md`
- Test: `apps/api/src/modules/courts/sports.integration.test.ts`

**Interfaces:**
- Consumes: `HolaDb` dari `@hola/db`, `okList` dari `../../lib/response.ts`
- Produces: `listActiveSports(db: HolaDb): Promise<SportRow[]>`, `serializeSport(sport: SportRow)` yang mengembalikan `{ id, code, name, icon_media_id, sort_order }`, dan `sportsRoutes`

- [ ] **Step 1: Tulis test yang gagal**

Buat `apps/api/src/modules/courts/sports.integration.test.ts`:

```ts
import { sports } from '@hola/db'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { listActiveSports } from './sports.repository.ts'

const ids = {
  active: '01920000-0000-7000-8000-0000000002a1',
  inactive: '01920000-0000-7000-8000-0000000002a2',
} as const

async function cleanFixtures(): Promise<void> {
  await db.delete(sports).where(eq(sports.id, ids.active))
  await db.delete(sports).where(eq(sports.id, ids.inactive))
}

beforeEach(async () => {
  await cleanFixtures()
  await db.insert(sports).values([
    { id: ids.active, code: 'SPORT-A', name: 'Padel fixture', sortOrder: 2, isActive: true },
    { id: ids.inactive, code: 'SPORT-B', name: 'Arsip fixture', sortOrder: 1, isActive: false },
  ])
})

afterAll(cleanFixtures)

describe('GET /sports publik', () => {
  it('P1-71: hanya olahraga aktif, terurut sort_order lalu name', async () => {
    const rows = await listActiveSports(db)
    const codes = rows.map((row) => row.code)

    expect(codes).toContain('SPORT-A')
    expect(codes).not.toContain('SPORT-B')
  })
})
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `pnpm dev:infra && pnpm --filter @hola/api exec vitest run src/modules/courts/sports.integration.test.ts`
Expected: FAIL — `Cannot find module './sports.repository.ts'`

- [ ] **Step 3: Tulis repository**

Buat `apps/api/src/modules/courts/sports.repository.ts`:

```ts
import { type HolaDb, sports } from '@hola/db'
import { asc, eq } from 'drizzle-orm'

export type SportRow = typeof sports.$inferSelect

/** Olahraga aktif untuk landing dan filter lapangan; urutan ditentukan admin. */
export async function listActiveSports(db: HolaDb): Promise<SportRow[]> {
  return db
    .select()
    .from(sports)
    .where(eq(sports.isActive, true))
    .orderBy(asc(sports.sortOrder), asc(sports.name))
}
```

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/api exec vitest run src/modules/courts/sports.integration.test.ts`
Expected: PASS

- [ ] **Step 5: Tambah serializer**

Tambahkan di akhir `apps/api/src/modules/courts/courts.serializer.ts`:

```ts
import type { SportRow } from './sports.repository.ts'

/** Bentuk publik olahraga; `is_active` tidak dibocorkan karena hanya yang aktif yang tampil. */
export function serializeSport(sport: SportRow) {
  return {
    id: sport.id,
    code: sport.code,
    name: sport.name,
    icon_media_id: sport.iconMediaId,
    sort_order: sport.sortOrder,
  }
}
```

- [ ] **Step 6: Tambah route**

Buat `apps/api/src/modules/courts/sports.routes.ts`:

```ts
/** Route publik baca daftar olahraga. */
import { Hono } from 'hono'
import { okList } from '../../lib/response.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { serializeSport } from './courts.serializer.ts'
import { listActiveSports } from './sports.repository.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables

export const sportsRoutes = new Hono<{ Variables: Variables }>().get('/sports', async (c) => {
  const rows = await listActiveSports(c.get('core').db)
  return c.json(okList(rows.map(serializeSport), {}))
})
```

- [ ] **Step 7: Pasang route di app**

Di `apps/api/src/app.ts`, tambahkan import `import { sportsRoutes } from './modules/courts/sports.routes.ts'` dan sisipkan `.route(API_PREFIX, sportsRoutes)` tepat sebelum baris `.route(API_PREFIX, courtsRoutes)`.

- [ ] **Step 8: Catat di kontrak API**

Di `docs/04-API-CONTRACT.md`, pada tabel endpoint publik tepat di atas baris `| GET | \`/courts\` |`, tambahkan:

```markdown
| GET | `/sports` | — | Olahraga aktif, terurut `sort_order`. Sumber daftar olahraga di landing & filter lapangan |
```

- [ ] **Step 9: Verifikasi menyeluruh**

Run: `pnpm --filter @hola/api typecheck && pnpm --filter @hola/api exec vitest run src/modules/courts/`
Expected: PASS, tanpa error tipe

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/courts/sports.repository.ts \
  apps/api/src/modules/courts/sports.routes.ts \
  apps/api/src/modules/courts/sports.integration.test.ts \
  apps/api/src/modules/courts/courts.serializer.ts \
  apps/api/src/app.ts docs/04-API-CONTRACT.md
git commit -m "feat(api): add public GET /sports"
```

---

### Task 2: `GET /courts` dan `GET /courts/{id}` publik

**Files:**
- Modify: `apps/api/src/modules/courts/courts.repository.ts`
- Modify: `apps/api/src/modules/courts/courts.schema.ts`
- Modify: `apps/api/src/modules/courts/courts.serializer.ts`
- Modify: `apps/api/src/modules/courts/courts.service.ts`
- Modify: `apps/api/src/modules/courts/courts.routes.ts`
- Test: `apps/api/src/modules/courts/courts-public.integration.test.ts`

**Interfaces:**
- Consumes: `serializeCourt` yang sudah ada, `listActiveSports` dari Task 1
- Produces:
  - `listPublicCourts(db, filter: { sportId?: string; status?: 'active' | 'inactive' | 'maintenance'; isIndoor?: boolean }): Promise<CourtRow[]>`
  - `findCourtDetail(db, courtId: string): Promise<{ court: CourtRow; hours: OperatingHourRow[]; photos: CourtPhotoRow[] } | null>` dengan `OperatingHourRow = { dayOfWeek: number; opensTime: string; closesTime: string }` dan `CourtPhotoRow = { mediaId: string; position: number; bucket: string; objectKey: string }`
  - `serializeCourtDetail(detail)` yang mengembalikan `serializeCourt(court)` ditambah `operating_hours: Array<{ day_of_week, opens_time, closes_time }>` dan `photos: Array<{ media_id, position, object_key }>`

- [ ] **Step 1: Tulis test yang gagal**

Buat `apps/api/src/modules/courts/courts-public.integration.test.ts`:

```ts
import { courtOperatingHours, courtPhotos, courts, mediaFiles, sports, venues } from '@hola/db'
import { eq } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../config/db.ts'
import { findCourtDetail, listPublicCourts } from './courts.repository.ts'

const ids = {
  venue: '01920000-0000-7000-8000-0000000002b1',
  sport: '01920000-0000-7000-8000-0000000002b2',
  courtActive: '01920000-0000-7000-8000-0000000002b3',
  courtInactive: '01920000-0000-7000-8000-0000000002b4',
  media: '01920000-0000-7000-8000-0000000002b5',
} as const

async function cleanFixtures(): Promise<void> {
  await db.delete(courtPhotos).where(eq(courtPhotos.courtId, ids.courtActive))
  await db.delete(courtOperatingHours).where(eq(courtOperatingHours.courtId, ids.courtActive))
  await db.delete(mediaFiles).where(eq(mediaFiles.id, ids.media))
  await db.delete(courts).where(eq(courts.id, ids.courtActive))
  await db.delete(courts).where(eq(courts.id, ids.courtInactive))
  await db.delete(sports).where(eq(sports.id, ids.sport))
  await db.delete(venues).where(eq(venues.id, ids.venue))
}

beforeEach(async () => {
  await cleanFixtures()
  await db.insert(venues).values({ id: ids.venue, name: 'Public court venue' })
  await db.insert(sports).values({ id: ids.sport, code: 'PUB', name: 'Public sport' })
  await db.insert(courts).values([
    {
      id: ids.courtActive,
      venueId: ids.venue,
      sportId: ids.sport,
      code: 'PUB-01',
      name: 'Public court aktif',
      status: 'active',
      isIndoor: true,
      sortOrder: 1,
    },
    {
      id: ids.courtInactive,
      venueId: ids.venue,
      sportId: ids.sport,
      code: 'PUB-02',
      name: 'Public court nonaktif',
      status: 'inactive',
      isIndoor: false,
      sortOrder: 2,
    },
  ])
  await db.insert(courtOperatingHours).values({
    courtId: ids.courtActive,
    dayOfWeek: 1,
    opensTime: '08:00',
    closesTime: '22:00',
  })
  await db.insert(mediaFiles).values({
    id: ids.media,
    bucket: 'hola-media',
    objectKey: 'fixtures/public-court.jpg',
    kind: 'court_photo',
    status: 'ready',
  })
  await db.insert(courtPhotos).values({
    courtId: ids.courtActive,
    mediaId: ids.media,
    position: 0,
  })
})

afterAll(cleanFixtures)

describe('endpoint publik lapangan', () => {
  it('P1-72: filter status menyaring lapangan nonaktif', async () => {
    const rows = await listPublicCourts(db, { status: 'active' })
    const codes = rows.map((row) => row.code)

    expect(codes).toContain('PUB-01')
    expect(codes).not.toContain('PUB-02')
  })

  it('P1-72: filter is_indoor dan sport_id dipakai bersama', async () => {
    const rows = await listPublicCourts(db, { sportId: ids.sport, isIndoor: true })

    expect(rows.map((row) => row.code)).toEqual(['PUB-01'])
  })

  it('P1-72: detail memuat jam operasional dan foto siap pakai', async () => {
    const detail = await findCourtDetail(db, ids.courtActive)

    expect(detail?.court.code).toBe('PUB-01')
    expect(detail?.hours).toEqual([{ dayOfWeek: 1, opensTime: '08:00:00', closesTime: '22:00:00' }])
    expect(detail?.photos).toEqual([
      {
        mediaId: ids.media,
        position: 0,
        bucket: 'hola-media',
        objectKey: 'fixtures/public-court.jpg',
      },
    ])
  })

  it('P1-72: id yang tidak ada mengembalikan null, bukan melempar', async () => {
    await expect(findCourtDetail(db, ids.courtInactive)).resolves.toMatchObject({
      photos: [],
      hours: [],
    })
  })
})
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/api exec vitest run src/modules/courts/courts-public.integration.test.ts`
Expected: FAIL — `listPublicCourts is not a function`

- [ ] **Step 3: Tambah query di repository**

Tambahkan di akhir `apps/api/src/modules/courts/courts.repository.ts`:

```ts
export interface PublicCourtFilter {
  sportId?: string | undefined
  status?: 'active' | 'inactive' | 'maintenance' | undefined
  isIndoor?: boolean | undefined
}

export interface CourtOperatingHourRow {
  dayOfWeek: number
  opensTime: string
  closesTime: string
}

export interface CourtPhotoRow {
  mediaId: string
  position: number
  bucket: string
  objectKey: string
}

export interface CourtDetail {
  court: CourtRow
  hours: CourtOperatingHourRow[]
  photos: CourtPhotoRow[]
}

export async function listPublicCourts(
  db: DbExecutor,
  filter: PublicCourtFilter,
): Promise<CourtRow[]> {
  const conditions = [
    filter.sportId === undefined ? undefined : eq(courts.sportId, filter.sportId),
    filter.status === undefined ? undefined : eq(courts.status, filter.status),
    filter.isIndoor === undefined ? undefined : eq(courts.isIndoor, filter.isIndoor),
  ].filter((condition) => condition !== undefined)

  const query = db.select().from(courts)
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query
  return filtered.orderBy(asc(courts.sortOrder), asc(courts.code))
}

/**
 * Detail satu court. Foto dibatasi media berstatus `ready` supaya halaman publik
 * tidak pernah menautkan objek yang uploadnya belum selesai.
 */
export async function findCourtDetail(db: DbExecutor, courtId: string): Promise<CourtDetail | null> {
  const court = await findCourt(db, courtId)
  if (!court) return null

  const hours = await db
    .select({
      dayOfWeek: courtOperatingHours.dayOfWeek,
      opensTime: courtOperatingHours.opensTime,
      closesTime: courtOperatingHours.closesTime,
    })
    .from(courtOperatingHours)
    .where(eq(courtOperatingHours.courtId, courtId))
    .orderBy(asc(courtOperatingHours.dayOfWeek))

  const photos = await db
    .select({
      mediaId: courtPhotos.mediaId,
      position: courtPhotos.position,
      bucket: mediaFiles.bucket,
      objectKey: mediaFiles.objectKey,
    })
    .from(courtPhotos)
    .innerJoin(mediaFiles, eq(mediaFiles.id, courtPhotos.mediaId))
    .where(and(eq(courtPhotos.courtId, courtId), eq(mediaFiles.status, 'ready')))
    .orderBy(asc(courtPhotos.position))

  return { court, hours, photos }
}
```

Ubah baris import Drizzle di kepala berkas menjadi `import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm'`.

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/api exec vitest run src/modules/courts/courts-public.integration.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Tambah schema query**

Tambahkan di akhir `apps/api/src/modules/courts/courts.schema.ts`:

```ts
export const courtsQuerySchema = z
  .object({
    sport_id: idSchema.optional(),
    status: z.enum(['active', 'inactive', 'maintenance']).optional(),
    is_indoor: z.enum(['true', 'false']).optional(),
  })
  .strict()
```

Jika `idSchema` atau `z` belum diimpor di berkas itu, tambahkan `import { idSchema } from '@hola/shared'` dan `import { z } from 'zod'`.

- [ ] **Step 6: Tambah serializer detail**

Tambahkan di `apps/api/src/modules/courts/courts.serializer.ts`:

```ts
import type { CourtDetail } from './courts.repository.ts'

/** Detail publik: court + jam operasional + foto. `bucket` tidak dibocorkan ke klien. */
export function serializeCourtDetail(detail: CourtDetail) {
  return {
    ...serializeCourt(detail.court),
    operating_hours: detail.hours.map((hour) => ({
      day_of_week: hour.dayOfWeek,
      opens_time: hour.opensTime,
      closes_time: hour.closesTime,
    })),
    photos: detail.photos.map((photo) => ({
      media_id: photo.mediaId,
      position: photo.position,
      object_key: photo.objectKey,
    })),
  }
}
```

- [ ] **Step 7: Tambah fungsi service**

Tambahkan di akhir `apps/api/src/modules/courts/courts.service.ts`:

```ts
import { err } from '../../lib/errors.ts'
import {
  type CourtDetail,
  type CourtRow,
  findCourtDetail,
  listPublicCourts,
  type PublicCourtFilter,
} from './courts.repository.ts'

export async function listCourts(
  ctx: Pick<CourtsServiceContext, 'db'>,
  filter: PublicCourtFilter,
): Promise<CourtRow[]> {
  return listPublicCourts(ctx.db, filter)
}

export async function getCourtDetail(
  ctx: Pick<CourtsServiceContext, 'db'>,
  courtId: string,
): Promise<CourtDetail> {
  const detail = await findCourtDetail(ctx.db, courtId)
  if (!detail) throw err.notFound('Lapangan tidak ditemukan.')
  return detail
}
```

Sesuaikan import yang sudah ada di berkas itu agar tidak terduplikasi — gabungkan ke satu pernyataan import per modul.

- [ ] **Step 8: Tambah route**

Di `apps/api/src/modules/courts/courts.routes.ts`, tambahkan dua route di rantai `courtsRoutes` **sebelum** `.post('/courts', …)` agar `/courts/:id` tidak menaungi rute admin:

```ts
  .get('/courts', zValidator('query', courtsQuerySchema, validationHook), async (c) => {
    const query = c.req.valid('query')
    const rows = await listCourts(
      { db: c.get('core').db },
      {
        sportId: query.sport_id,
        status: query.status,
        isIndoor: query.is_indoor === undefined ? undefined : query.is_indoor === 'true',
      },
    )
    return c.json(okList(rows.map(serializeCourt), {}))
  })
  .get('/courts/:id', zValidator('param', courtIdParam, validationHook), async (c) => {
    const detail = await getCourtDetail({ db: c.get('core').db }, c.req.valid('param').id)
    return c.json(ok(serializeCourtDetail(detail)))
  })
```

Tambahkan `okList` ke import dari `../../lib/response.ts`, `courtsQuerySchema` ke import schema, `serializeCourtDetail` ke import serializer, dan `getCourtDetail, listCourts` ke import service.

- [ ] **Step 9: Verifikasi**

Run: `pnpm --filter @hola/api typecheck && pnpm --filter @hola/api exec vitest run src/modules/courts/`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/courts/
git commit -m "feat(api): add public court list and detail endpoints"
```

---

### Task 3: Pratinjau pembatalan di `GET /bookings/{id}` + `require_contiguous_slots` publik

**Files:**
- Modify: `apps/api/src/modules/bookings/bookings.service.ts`
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts`
- Modify: `apps/api/src/modules/system/public-config.service.ts`
- Test: `apps/api/src/modules/bookings/booking-cancel-preview.test.ts`

**Interfaces:**
- Consumes: `computeRefundAmount(booking: RefundBooking, policy: RefundPolicy, now: Date): RefundComputation` dari `./booking-refund.ts`; `findRefundPolicy`, `findPaidPaymentForBooking` yang sudah dipakai `cancelBooking`
- Produces:
  - `buildCancellationPreview(input: { status: BookingRow['status']; payment: { amount: number; gatewayFeeAmount: number } | null; startsAt: Date; policy: RefundPolicy; now: Date }): { isCancellable: boolean; refundEstimateAmount: number; policyApplied: string }` diekspor dari `./booking-refund.ts`
  - `getBookingDetail` mengembalikan `{ booking, items, cancellation }` dengan `cancellation` bertipe hasil `buildCancellationPreview`
  - Response `GET /bookings/{id}` memuat `is_cancellable`, `refund_estimate_amount`, `policy_applied`
  - `PublicConfig` memuat `require_contiguous_slots: boolean`

- [ ] **Step 1: Tulis test yang gagal**

Buat `apps/api/src/modules/bookings/booking-cancel-preview.test.ts` — test unit murni, tidak butuh infra:

```ts
import { describe, expect, it } from 'vitest'
import { buildCancellationPreview } from './booking-refund.ts'

const now = new Date('2026-08-08T02:00:00.000Z')
const startsAtFar = new Date('2026-08-11T02:00:00.000Z')
const startsAtSoon = new Date('2026-08-08T12:00:00.000Z')

describe('pratinjau pembatalan sebelum konfirmasi', () => {
  it('P1-78: booking confirmed >48 jam mengembalikan nominal dikurangi fee gateway', () => {
    const preview = buildCancellationPreview({
      status: 'confirmed',
      payment: { amount: 300_000, gatewayFeeAmount: 5_000 },
      startsAt: startsAtFar,
      policy: 'option_b',
      now,
    })

    expect(preview).toEqual({
      isCancellable: true,
      refundEstimateAmount: 295_000,
      policyApplied: 'option_b_100_percent_minus_gateway_fee',
    })
  })

  it('P1-78 / BR-B-63: <24 jam tetap cancellable tapi refund nol dengan kebijakan jelas', () => {
    const preview = buildCancellationPreview({
      status: 'confirmed',
      payment: { amount: 300_000, gatewayFeeAmount: 5_000 },
      startsAt: startsAtSoon,
      policy: 'option_b',
      now,
    })

    expect(preview.isCancellable).toBe(true)
    expect(preview.refundEstimateAmount).toBe(0)
    expect(preview.policyApplied).toBe('option_b_no_refund_under_24h')
  })

  it('P1-78: pending_payment belum berbayar sehingga tidak ada refund', () => {
    const preview = buildCancellationPreview({
      status: 'pending_payment',
      payment: null,
      startsAt: startsAtFar,
      policy: 'option_b',
      now,
    })

    expect(preview).toEqual({
      isCancellable: true,
      refundEstimateAmount: 0,
      policyApplied: 'pending_payment_no_refund',
    })
  })

  it('P1-78: status selain pending_payment/confirmed tidak dapat dibatalkan', () => {
    for (const status of ['completed', 'cancelled', 'expired', 'no_show'] as const) {
      const preview = buildCancellationPreview({
        status,
        payment: null,
        startsAt: startsAtFar,
        policy: 'option_b',
        now,
      })

      expect(preview.isCancellable).toBe(false)
      expect(preview.refundEstimateAmount).toBe(0)
      expect(preview.policyApplied).toBe('not_cancellable')
    }
  })
})
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/api exec vitest run src/modules/bookings/booking-cancel-preview.test.ts`
Expected: FAIL — `buildCancellationPreview is not exported`

- [ ] **Step 3: Tulis fungsi pratinjau**

Tambahkan di akhir `apps/api/src/modules/bookings/booking-refund.ts`:

```ts
export interface CancellationPreviewInput {
  status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | 'expired' | 'no_show'
  payment: { amount: number; gatewayFeeAmount: number } | null
  startsAt: Date
  policy: RefundPolicy
  now: Date
}

export interface CancellationPreview {
  isCancellable: boolean
  refundEstimateAmount: number
  policyApplied: string
}

/**
 * Pratinjau yang ditampilkan SEBELUM customer menekan batal (BR-B-71).
 * Memakai `computeRefundAmount` yang sama dengan `cancelBooking` supaya angka
 * yang dijanjikan di layar tidak pernah berbeda dari yang dieksekusi.
 */
export function buildCancellationPreview(input: CancellationPreviewInput): CancellationPreview {
  if (input.status !== 'pending_payment' && input.status !== 'confirmed') {
    return { isCancellable: false, refundEstimateAmount: 0, policyApplied: 'not_cancellable' }
  }
  if (!input.payment) {
    return {
      isCancellable: true,
      refundEstimateAmount: 0,
      policyApplied: 'pending_payment_no_refund',
    }
  }
  const refund = computeRefundAmount(
    {
      totalAmount: input.payment.amount,
      startsAt: input.startsAt,
      gatewayFeeAmount: input.payment.gatewayFeeAmount,
    },
    input.policy,
    input.now,
  )
  return {
    isCancellable: true,
    refundEstimateAmount: refund.amount,
    policyApplied: refund.policyApplied,
  }
}
```

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/api exec vitest run src/modules/bookings/booking-cancel-preview.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Sambungkan ke `getBookingDetail`**

Di `apps/api/src/modules/bookings/bookings.service.ts`, ganti badan `getBookingDetail` menjadi:

```ts
export async function getBookingDetail(
  ctx: Pick<BookingsServiceContext, 'db' | 'actor' | 'now'>,
  bookingId: string,
): Promise<{ booking: BookingRow; items: BookingItemRow[]; cancellation: CancellationPreview }> {
  const found = await findBookingWithItems(ctx.db, bookingId)
  if (!found) throw err.notFound('Booking tidak ditemukan.')
  if (ctx.actor.role === 'customer' && found.booking.customerUserId !== ctx.actor.userId)
    throw err.notOwner()

  const payment =
    found.booking.status === 'confirmed'
      ? await findPaidPaymentForBooking(ctx.db, bookingId)
      : null
  const policy = await findRefundPolicy(ctx.db)
  const startsAt = found.items.reduce(
    (earliest, item) => (item.startsAt < earliest ? item.startsAt : earliest),
    found.items[0]?.startsAt ?? ctx.now,
  )
  const cancellation = buildCancellationPreview({
    status: found.booking.status,
    payment: payment ? { amount: payment.amount, gatewayFeeAmount: payment.gatewayFeeAmount } : null,
    startsAt,
    policy,
    now: ctx.now,
  })

  return { ...found, cancellation }
}
```

Tambahkan `buildCancellationPreview` dan `type CancellationPreview` ke import dari `./booking-refund.ts`.

Semua pemanggil `getBookingDetail` sudah meneruskan konteks yang memuat `now` (`context(c)` di `bookings.routes.ts` menyertakannya), jadi tidak ada pemanggil yang perlu diubah. Jalankan `pnpm --filter @hola/api typecheck` untuk membuktikannya sebelum lanjut.

- [ ] **Step 6: Ekspos di route**

Di `apps/api/src/modules/bookings/bookings.routes.ts`, ubah `serializeDetail`:

```ts
function serializeDetail(result: Awaited<ReturnType<typeof getBookingDetail>>) {
  return {
    ...serializeBooking(result.booking),
    is_cancellable: result.cancellation.isCancellable,
    refund_estimate_amount: result.cancellation.refundEstimateAmount,
    policy_applied: result.cancellation.policyApplied,
    quote: result.booking.quoteSnapshot,
    items: result.items.map((item) => ({
      id: item.id,
      court_id: item.courtId,
      starts_at: item.startsAt.toISOString(),
      ends_at: item.endsAt.toISOString(),
      rate_class: item.rateClass,
      unit_price_amount: item.unitPriceAmount,
      line_total_amount: item.lineTotalAmount,
    })),
  }
}
```

- [ ] **Step 7: Tambah `require_contiguous_slots` ke config publik**

Di `apps/api/src/modules/system/public-config.service.ts`:

1. Tambahkan `SETTINGS_KEY.REQUIRE_CONTIGUOUS_SLOTS` ke array `PUBLIC_SETTINGS`.
2. Tambahkan `require_contiguous_slots: boolean` ke interface `PublicConfig`.
3. Tambahkan pembaca boolean di dekat helper lain:

```ts
function booleanSetting(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}
```

4. Di objek yang dikembalikan `getPublicConfig`, tambahkan tepat setelah `booking_horizon_days`:

```ts
    require_contiguous_slots: booleanSetting(
      settings.get(SETTINGS_KEY.REQUIRE_CONTIGUOUS_SLOTS),
      false,
    ),
```

`settings` adalah `Map` yang sudah dibangun di baris ketiga fungsi itu (`new Map(rows.map((row) => [row.key, row.value]))`), sama seperti yang dipakai `cancellation_policy_text`.

- [ ] **Step 8: Verifikasi**

Run: `pnpm --filter @hola/api typecheck && pnpm --filter @hola/api test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/bookings/ apps/api/src/modules/system/public-config.service.ts
git commit -m "feat(api): expose cancellation preview and contiguity setting"
```

---

# Fase B — Fondasi `apps/web`

### Task 4: Tailwind v4, token desain, dan font

**Files:**
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/src/styles/theme.css`
- Create: `apps/web/src/lib/fonts.ts`
- Create: `apps/web/src/lib/cn.ts`
- Modify: `apps/web/src/styles/globals.css` (isi lama **dipertahankan sementara**, lihat Step 4)
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string` dari `src/lib/cn.ts`; `fontVariables: string` dari `src/lib/fonts.ts` berisi daftar kelas variabel font untuk dipasang di `<html>`

- [ ] **Step 1: Pasang dependensi**

```bash
pnpm --filter @hola/web add tailwindcss@^4.1.12 @tailwindcss/postcss@^4.1.12 clsx@^2.1.1 tailwind-merge@^3.2.0 lucide-react@^0.487.0
```

- [ ] **Step 2: Konfigurasi PostCSS**

Buat `apps/web/postcss.config.mjs`:

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
```

- [ ] **Step 3: Tulis token desain**

Buat `apps/web/src/styles/theme.css`. Nilai diambil dari `references/web/src/styles/theme.css`; blok `.dark` sengaja tidak disalin.

```css
@custom-variant dark (&:is(.dark *));

:root {
  --background: #f4f8ff;
  --foreground: #0a1f5c;
  --card: #ffffff;
  --card-foreground: #0a1f5c;
  --popover: #ffffff;
  --popover-foreground: #0a1f5c;
  --primary: #1565c0;
  --primary-foreground: #ffffff;
  --secondary: #e3edff;
  --secondary-foreground: #1565c0;
  --muted: #dde8ff;
  --muted-foreground: #4a6fa5;
  --accent: #96f535;
  --accent-foreground: #0a2a00;
  --destructive: #d4183d;
  --destructive-foreground: #ffffff;
  --border: rgba(21, 101, 192, 0.13);
  --input: transparent;
  --input-background: #eaf0ff;
  --ring: #1565c0;
  --radius: 0.875rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-input-background: var(--input-background);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: var(--font-dm-sans), system-ui, sans-serif;
  --font-display: var(--font-fredoka), system-ui, sans-serif;
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
  }

  h1,
  h2,
  h3,
  h4 {
    @apply font-display font-semibold;
  }
}
```

- [ ] **Step 4: Sambungkan Tailwind di `globals.css`**

Sunting `apps/web/src/styles/globals.css` — **tambahkan dua baris di paling atas** dan biarkan seluruh CSS lama di bawahnya untuk sementara. Halaman auth masih memakainya dan baru dipindah di Task 6; menghapusnya sekarang akan merusak lima halaman yang sudah jalan.

```css
@import 'tailwindcss';
@import './theme.css';

/* CSS lama di bawah ini dihapus pada Task 6 setelah halaman auth dipindah. */
```

- [ ] **Step 5: Muat font**

Buat `apps/web/src/lib/fonts.ts`:

```ts
import { DM_Sans, Fredoka } from 'next/font/google'

/** Heading. Diselfhost saat build karena CSP memakai `font-src 'self' data:`. */
const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
})

/** Body. */
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const fontVariables = `${fredoka.variable} ${dmSans.variable}`
```

- [ ] **Step 6: Pasang di layout**

Di `apps/web/src/app/layout.tsx`, tambahkan `import { fontVariables } from '../lib/fonts.ts'` dan ubah elemen `<html>`:

```tsx
    <html lang="id" className={fontVariables}>
```

- [ ] **Step 7: Tulis util `cn`**

Buat `apps/web/src/lib/cn.ts`:

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Menggabungkan kelas kondisional lalu meredam konflik utilitas Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 8: Verifikasi build menghasilkan token**

```bash
pnpm --filter @hola/web typecheck
pnpm --filter @hola/web build
grep -r "1565c0" apps/web/.next/static/css/ | head -1
```

Expected: typecheck bersih, build sukses, dan `grep` menemukan `#1565c0` di CSS hasil build. Kalau `grep` kosong, Tailwind belum memproses `theme.css` — periksa `postcss.config.mjs` dan urutan `@import` di `globals.css`.

- [ ] **Step 9: Commit**

```bash
git add apps/web/postcss.config.mjs apps/web/src/styles/ apps/web/src/lib/fonts.ts \
  apps/web/src/lib/cn.ts apps/web/src/app/layout.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add tailwind v4 design tokens and fonts"
```

---

### Task 5: Subset shadcn/ui + setup test React

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/label.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/skeleton.tsx`
- Create: `apps/web/src/components/ui/dialog.tsx`, `sheet.tsx`, `accordion.tsx`, `checkbox.tsx`, `select.tsx`
- Test: `apps/web/src/components/ui/button.test.tsx`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: `cn` dari `src/lib/cn.ts`
- Produces: `Button` dengan prop `variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'destructive'`, `size?: 'sm' | 'default' | 'lg' | 'icon'`, `asChild?: boolean`; `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`; `Input`; `Label`; `Badge` dengan `variant?: 'default' | 'secondary' | 'outline' | 'accent'`; `Skeleton`; plus re-export Radix untuk `Dialog`, `Sheet`, `Accordion`, `Checkbox`, `Select`

- [ ] **Step 1: Pasang dependensi**

```bash
pnpm --filter @hola/web add class-variance-authority@^0.7.1 sonner@^2.0.3 \
  @radix-ui/react-slot@^1.1.2 @radix-ui/react-dialog@^1.1.6 @radix-ui/react-label@^2.1.2 \
  @radix-ui/react-accordion@^1.2.3 @radix-ui/react-checkbox@^1.1.4 @radix-ui/react-select@^2.1.6
pnpm --filter @hola/web add -D @vitejs/plugin-react@^4.7.0 @testing-library/react@^16.3.0 \
  @testing-library/user-event@^14.6.1 happy-dom@^17.4.4
```

- [ ] **Step 2: Konfigurasi Vitest**

Buat `apps/web/vitest.config.ts`. Default `node` menjaga `src/lib/*.test.ts` yang sudah ada tetap berjalan seperti sebelumnya.

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    environmentMatchGlobs: [['src/components/**', 'happy-dom']],
    globals: true,
  },
})
```

- [ ] **Step 3: Tulis test yang gagal**

Buat `apps/web/src/components/ui/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button.tsx'

describe('Button', () => {
  it('merender label dan tipe default button', () => {
    render(<Button>Pesan Lapangan</Button>)
    const button = screen.getByRole('button', { name: 'Pesan Lapangan' })

    expect(button).toBeDefined()
    expect(button.getAttribute('type')).toBe('button')
  })

  it('varian accent memakai token aksen, bukan warna literal', () => {
    render(<Button variant="accent">Bayar</Button>)

    expect(screen.getByRole('button').className).toContain('bg-accent')
  })

  it('asChild merender elemen anak alih-alih button', () => {
    render(
      <Button asChild>
        <a href="/lapangan">Lihat lapangan</a>
      </Button>,
    )

    expect(screen.getByRole('link', { name: 'Lihat lapangan' })).toBeDefined()
  })
})
```

- [ ] **Step 4: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/web exec vitest run src/components/ui/button.test.tsx`
Expected: FAIL — `Cannot find module './button.tsx'`

- [ ] **Step 5: Tulis Button**

Buat `apps/web/src/components/ui/button.tsx`:

```tsx
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground hover:brightness-105',
        outline: 'border-2 border-border bg-transparent text-foreground hover:bg-secondary',
        ghost: 'bg-transparent text-foreground hover:bg-secondary',
        accent: 'bg-accent text-accent-foreground shadow-lg hover:brightness-110',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-110',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        default: 'h-11 px-6 text-base',
        lg: 'h-14 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  asChild = false,
  className,
  size,
  type,
  variant,
  ...props
}: ButtonProps): ReactNode {
  if (asChild) {
    return <Slot className={cn(buttonVariants({ variant, size }), className)} {...props} />
  }
  return (
    <button
      type={type ?? 'button'}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
```

- [ ] **Step 6: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/web exec vitest run src/components/ui/button.test.tsx`
Expected: PASS (3 test)

- [ ] **Step 7: Tulis primitif sederhana**

Buat `apps/web/src/components/ui/card.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('rounded-xl border bg-card text-card-foreground', className)} {...props} />
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>): ReactNode {
  return <h3 className={cn('font-display text-lg font-bold', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props} />
}
```

Buat `apps/web/src/components/ui/input.tsx`:

```tsx
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-lg border bg-input-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  )
}
```

Buat `apps/web/src/components/ui/label.tsx`:

```tsx
import * as LabelPrimitive from '@radix-ui/react-label'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export function Label({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>): ReactNode {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-semibold text-foreground', className)}
      {...props}
    />
  )
}
```

Buat `apps/web/src/components/ui/badge.tsx`:

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border text-foreground',
        accent: 'bg-accent/20 text-accent-foreground border border-accent/40',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): ReactNode {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
```

Buat `apps/web/src/components/ui/skeleton.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} {...props} />
}
```

- [ ] **Step 8: Salin primitif Radix dari referensi**

Salin lima berkas berikut dari `references/web/src/app/components/ui/` ke `apps/web/src/components/ui/`:

`dialog.tsx`, `sheet.tsx`, `accordion.tsx`, `checkbox.tsx`, `select.tsx`

Pada setiap berkas, lakukan penyesuaian berikut:

1. Ganti `import { cn } from "./utils"` menjadi `import { cn } from '../../lib/cn.ts'`.
2. Ganti seluruh kutip ganda pada string TypeScript menjadi kutip tunggal (JSX tetap kutip ganda).
3. Hapus akhiran titik koma.
4. Ganti ikon `lucide-react` yang diimpor agar tetap sesuai — versi lucide di `apps/web` sama dengan referensi, jadi nama ikon tidak berubah.
5. Hapus kelas `dark:` yang muncul; mode gelap tidak dipakai.

Jalankan `pnpm lint:fix` setelah menyalin agar gaya kode seragam.

- [ ] **Step 9: Verifikasi seluruh test**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test`
Expected: PASS — termasuk `src/lib/auth.test.ts` dan `src/lib/security-headers.test.ts` yang tetap berjalan di environment `node`

- [ ] **Step 10: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/src/components/ui/ apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add shadcn component subset and react test setup"
```

---

### Task 6: Pindahkan halaman auth ke Tailwind

**Files:**
- Modify: `apps/web/src/components/auth/AuthCard.tsx`
- Modify: `apps/web/src/components/auth/LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `VerifyEmailForm.tsx`, `SessionStatus.tsx`
- Modify: `apps/web/src/app/(public)/page.tsx`
- Modify: `apps/web/src/styles/globals.css`

**Interfaces:**
- Consumes: `Button`, `Input`, `Label`, `Card` dari Task 5; `cn` dari Task 4
- Produces: `AuthCard` dengan prop yang **tidak berubah** (`title: string`, `description: string`, `children: ReactNode`) — hanya markupnya yang diganti

- [ ] **Step 1: Ganti AuthCard**

Tulis ulang `apps/web/src/components/auth/AuthCard.tsx`:

```tsx
import type { ReactNode } from 'react'

interface AuthCardProps {
  children: ReactNode
  description: string
  title: string
}

export function AuthCard({ children, description, title }: AuthCardProps): ReactNode {
  return (
    <main className="grid min-h-screen items-center justify-items-center bg-background p-6">
      <section
        className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-xl shadow-primary/5"
        aria-labelledby="auth-title"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Hola</p>
        <h1 id="auth-title" className="mt-2 font-display text-3xl font-bold text-foreground">
          {title}
        </h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
        {children}
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Ganti markup LoginForm**

Di `apps/web/src/components/auth/LoginForm.tsx`, **hanya blok `return`** yang diubah. Semua logika (`submit`, `onSubmit`, state) tidak disentuh.

```tsx
  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="identifier">Email atau nomor HP</Label>
        <Input id="identifier" name="identifier" autoComplete="username" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? (
        <p className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive">{error}</p>
      ) : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Memproses…' : 'Masuk'}
      </Button>
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        <Link className="font-semibold text-primary hover:underline" href="/lupa-password">
          Lupa password?
        </Link>
        <Link className="font-semibold text-primary hover:underline" href="/daftar">
          Belum punya akun? Daftar
        </Link>
      </div>
    </form>
  )
```

Tambahkan import `import { Button } from '../ui/button.tsx'`, `import { Input } from '../ui/input.tsx'`, `import { Label } from '../ui/label.tsx'`.

- [ ] **Step 3: Terapkan pemetaan kelas yang sama ke empat form sisanya**

Untuk `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, dan `VerifyEmailForm.tsx`, ganti kelas lama memakai tabel ini. Jangan mengubah logika apa pun.

| Kelas lama | Pengganti |
|---|---|
| `className="auth-form"` | `className="mt-6 grid gap-4"` |
| `<label className="field"><span>X</span><input …/></label>` | `<div className="grid gap-1.5"><Label htmlFor="…">X</Label><Input id="…" …/></div>` |
| `className="form-error"` | `className="rounded-lg bg-destructive/10 p-3 leading-snug text-destructive"` |
| `className="form-success"` | `className="rounded-lg bg-accent/20 p-3 leading-snug text-accent-foreground"` |
| `className="form-links"` | `className="flex flex-wrap gap-x-4 gap-y-3"` |
| `<button type="submit">` | `<Button type="submit">` |
| `<Link>` biasa di dalam form | tambahkan `className="font-semibold text-primary hover:underline"` |
| `className="muted"` / `className="session-status"` | `className="leading-relaxed text-muted-foreground"` |
| `className="eyebrow"` | `className="text-xs font-bold uppercase tracking-widest text-primary"` |

Setiap `Input` wajib mendapat `id` yang cocok dengan `htmlFor` pada `Label`-nya — ini yang membuat label tetap terhubung setelah `<label>` pembungkus dilepas.

- [ ] **Step 4: Sesuaikan `SessionStatus.tsx` dan landing sementara**

Di `SessionStatus.tsx`, ganti `className="session-status"` menjadi `className="mt-6 leading-relaxed text-muted-foreground"`.

Di `apps/web/src/app/(public)/page.tsx`, ganti kelas lama memakai tabel Step 3 (`landing-shell` → `mx-auto max-w-6xl p-6`, `top-nav` → `flex items-center justify-between`, `brand` → `font-display text-xl font-bold`, `hero` → `max-w-2xl py-24`, `button-link` → pakai `<Button asChild>`, `text-link` → `font-semibold text-primary hover:underline`). Halaman ini diganti total di Task 9; langkah ini hanya menjaganya tetap tampil benar di antara dua task.

- [ ] **Step 5: Hapus CSS lama**

Ganti seluruh isi `apps/web/src/styles/globals.css` menjadi dua baris:

```css
@import 'tailwindcss';
@import './theme.css';
```

- [ ] **Step 6: Verifikasi tidak ada kelas yatim**

```bash
grep -rnE "className=\"(auth-shell|auth-card|auth-form|field|form-error|form-success|form-links|eyebrow|muted|session-status|landing-shell|top-nav|nav-links|brand|hero|hero-actions|button-link|text-link)" apps/web/src
```

Expected: tidak ada keluaran. Setiap kecocokan berarti ada kelas yang kehilangan definisinya dan akan tampil tanpa gaya.

- [ ] **Step 7: Verifikasi test dan build**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test && pnpm --filter @hola/web build`
Expected: PASS

- [ ] **Step 8: Periksa dengan mata**

```bash
pnpm --filter @hola/web dev
```

Buka `http://localhost:3000/login`, `/daftar`, `/lupa-password`, `/reset-password`, `/verifikasi-email`. Pastikan: latar biru muda, kartu putih, heading berfont Fredoka, tombol biru `#1565c0`, dan tidak ada teks bertumpuk tanpa gaya.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/auth/ apps/web/src/app/ apps/web/src/styles/globals.css
git commit -m "refactor(web): move auth pages to tailwind design system"
```

---

### Task 7: CSP untuk Snap Midtrans

**Files:**
- Modify: `apps/web/src/lib/security-headers.ts`
- Modify: `apps/web/src/lib/security-headers.test.ts`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/.env.example`
- Modify: `packages/shared/src/env/frontend.ts`

**Interfaces:**
- Produces: `createSecurityHeaders(options: SecurityHeaderOptions)` dengan `SecurityHeaderOptions` bertambah field `midtransIsProduction: boolean`; konstanta `MIDTRANS_ORIGIN = { production: 'https://app.midtrans.com', sandbox: 'https://app.sandbox.midtrans.com' }` diekspor dari berkas yang sama
- Env baru: `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` bernilai `'true'` atau `'false'`

- [ ] **Step 1: Tulis test yang gagal**

Tambahkan di `apps/web/src/lib/security-headers.test.ts`, di dalam `describe` yang sudah ada:

```ts
  it('P1-76: CSP mengizinkan skrip dan iframe Snap produksi', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.hola.test',
      isDevelopment: false,
      sentryDsn: undefined,
      midtransIsProduction: true,
    })
    const csp = new Map(headers.map((header) => [header.key, header.value])).get(
      'Content-Security-Policy',
    )

    expect(csp).toContain('frame-src')
    expect(csp).toContain('https://app.midtrans.com')
    expect(csp).not.toContain('https://app.sandbox.midtrans.com')
  })

  it('P1-76: build non-produksi hanya mengizinkan origin sandbox', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.hola.test',
      isDevelopment: false,
      sentryDsn: undefined,
      midtransIsProduction: false,
    })
    const csp = new Map(headers.map((header) => [header.key, header.value])).get(
      'Content-Security-Policy',
    )

    expect(csp).toContain('https://app.sandbox.midtrans.com')
    expect(csp).not.toContain('https://app.midtrans.com/')
  })
```

Perbarui juga test `F0-69` yang sudah ada dengan menambahkan `midtransIsProduction: false` ke argumennya, agar tetap kompilasi.

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/web exec vitest run src/lib/security-headers.test.ts`
Expected: FAIL — `frame-src` tidak ditemukan

- [ ] **Step 3: Perbarui pembuat header**

Ganti isi `apps/web/src/lib/security-headers.ts`:

```ts
export interface SecurityHeader {
  key: string
  value: string
}

export interface SecurityHeaderOptions {
  apiBaseUrl: string | undefined
  isDevelopment: boolean
  sentryDsn: string | undefined
  /** Menentukan satu origin Snap yang diizinkan; sandbox tidak pernah ikut ke CSP produksi. */
  midtransIsProduction: boolean
}

export const MIDTRANS_ORIGIN = {
  production: 'https://app.midtrans.com',
  sandbox: 'https://app.sandbox.midtrans.com',
} as const

function originOf(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

/** Header S-4 dengan origin API/Sentry/Midtrans yang dipersempit dari konfigurasi build. */
export function createSecurityHeaders(options: SecurityHeaderOptions): SecurityHeader[] {
  const midtransOrigin = options.midtransIsProduction
    ? MIDTRANS_ORIGIN.production
    : MIDTRANS_ORIGIN.sandbox
  const connectSources = [
    "'self'",
    originOf(options.apiBaseUrl),
    originOf(options.sentryDsn),
    midtransOrigin,
  ]
    .filter((source): source is string => source !== undefined)
    .join(' ')
  const scriptSources = options.isDevelopment
    ? `'self' 'unsafe-inline' 'unsafe-eval' ${midtransOrigin}`
    : `'self' 'unsafe-inline' ${midtransOrigin}`
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `frame-src 'self' ${midtransOrigin}`,
    `connect-src ${connectSources}`,
  ].join('; ')

  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ]
}
```

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/web exec vitest run src/lib/security-headers.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Tambah env ke schema bersama**

Di `packages/shared/src/env/frontend.ts`, tambahkan ke `webEnvSchema` tepat setelah `NEXT_PUBLIC_MEDIA_BASE_URL`:

```ts
  /**
   * Wajib sama dengan mode Midtrans di API. Nilainya membentuk CSP saat build
   * sekaligus memilih URL `snap.js`; kalau berbeda, popup Snap terblokir.
   */
  NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION: z.enum(['true', 'false']).default('false'),
```

- [ ] **Step 6: Pakai di `next.config.ts`**

Di `apps/web/next.config.ts`, ubah pemanggilan `createSecurityHeaders`:

```ts
        headers: createSecurityHeaders({
          apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
          isDevelopment: process.env.NODE_ENV === 'development',
          sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          midtransIsProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true',
        }),
```

Tambahkan juga konfigurasi gambar jarak jauh di objek `nextConfig`, sejajar dengan `poweredByHeader`:

```ts
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.hola.id' },
      { protocol: 'http', hostname: 'localhost', port: '9000' },
    ],
  },
```

- [ ] **Step 7: Tambah ke `.env.example`**

Di `apps/web/.env.example`, tambahkan setelah baris `NEXT_PUBLIC_MEDIA_BASE_URL`:

```
# Wajib sama dengan mode Midtrans di API. Membentuk CSP saat build.
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false
```

- [ ] **Step 8: Verifikasi**

Run: `pnpm check:env && pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test`
Expected: PASS. `check:env` membandingkan kunci schema dengan `.env.example`, jadi ia akan gagal kalau salah satu langkah di atas terlewat.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/security-headers.ts apps/web/src/lib/security-headers.test.ts \
  apps/web/next.config.ts apps/web/.env.example packages/shared/src/env/frontend.ts
git commit -m "feat(web): allow midtrans snap origin in csp"
```

---

# Fase C — Halaman publik

### Task 8: Lapisan data server + pemformatan

**Files:**
- Create: `apps/web/src/lib/server-api.ts`
- Create: `apps/web/src/lib/format.ts`
- Create: `apps/web/src/lib/public-config.ts`
- Test: `apps/web/src/lib/format.test.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: `createHolaClient` dari `@hola/api-client`; endpoint dari Task 1–3
- Produces:
  - `serverApi: HolaClient` — client tanpa sesi untuk endpoint publik
  - `type Court`, `type CourtDetail`, `type Sport` — diturunkan dari tipe response API, bukan ditulis ulang
  - `fetchSports(): Promise<Sport[]>`, `fetchCourts(filter?: { sportId?: string }): Promise<Court[]>`, `fetchCourtDetail(courtId: string): Promise<CourtDetail | null>`
  - `formatRupiah(amount: number): string`, `formatTimeWita(iso: string): string`, `formatDateWita(iso: string): string`, `formatDayName(dayOfWeek: number): string`, `formatClock(time: string): string`
  - `fetchPublicConfig(): Promise<PublicConfig>` di `public-config.ts` (khusus peladen)
  - `serverTimeOffsetMs(serverTime: string, clientNow: number): number` di `server-time.ts` (modul murni, aman untuk klien)

- [ ] **Step 1: Pasang `hono` sebagai dependensi tipe**

```bash
pnpm --filter @hola/web add hono@^4.9.11
```

Versi harus sama dengan yang dipakai `apps/api`; periksa dengan `grep '"hono"' apps/api/package.json` dan samakan.

- [ ] **Step 2: Tulis test pemformatan yang gagal**

Buat `apps/web/src/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatClock, formatDayName, formatRupiah, formatTimeWita } from './format.ts'

describe('pemformatan tampilan', () => {
  it('rupiah tanpa desimal dan tanpa aritmetika', () => {
    expect(formatRupiah(150_000)).toBe('Rp150.000')
    expect(formatRupiah(0)).toBe('Rp0')
  })

  it('jam ditampilkan dalam zona WITA apa pun zona peladen', () => {
    expect(formatTimeWita('2026-07-28T06:00:00+08:00')).toBe('06.00')
    expect(formatTimeWita('2026-07-27T22:00:00Z')).toBe('06.00')
  })

  it('nama hari mengikuti indeks EXTRACT(DOW) PostgreSQL', () => {
    expect(formatDayName(0)).toBe('Minggu')
    expect(formatDayName(6)).toBe('Sabtu')
  })

  it('jam operasional dari kolom time dipangkas ke jam dan menit', () => {
    expect(formatClock('08:00:00')).toBe('08.00')
    expect(formatClock('22:30')).toBe('22.30')
  })
})
```

- [ ] **Step 3: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/web exec vitest run src/lib/format.test.ts`
Expected: FAIL — modul `./format.ts` tidak ada

- [ ] **Step 4: Tulis pemformat**

Buat `apps/web/src/lib/format.ts`:

```ts
const TIMEZONE = 'Asia/Makassar'

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const timeWita = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const dateWita = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

/**
 * Hanya memformat. Tidak menjumlah, mengali, atau membulatkan — seluruh angka
 * rupiah datang jadi dari API (BR-B-12).
 */
export function formatRupiah(amount: number): string {
  return rupiah.format(amount).replace(/\s/g, '')
}

export function formatTimeWita(iso: string): string {
  return timeWita.format(new Date(iso))
}

export function formatDateWita(iso: string): string {
  return dateWita.format(new Date(iso))
}

/** Indeks mengikuti `EXTRACT(DOW)`: 0 = Minggu. */
export function formatDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? '—'
}

/** Kolom `time` PostgreSQL datang sebagai `HH:MM:SS` atau `HH:MM`. */
export function formatClock(time: string): string {
  const [hour = '00', minute = '00'] = time.split(':')
  return `${hour}.${minute}`
}
```

- [ ] **Step 5: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/web exec vitest run src/lib/format.test.ts`
Expected: PASS (4 test). Kalau `formatRupiah` menghasilkan `Rp 150.000` dengan spasi tak terputus, `replace(/\s/g, '')` sudah menanganinya; kalau masih gagal, periksa versi Node — repo mensyaratkan Node ≥ 20.

- [ ] **Step 6: Tulis client server-side**

Buat `apps/web/src/lib/server-api.ts`:

```ts
import { createHolaClient, type HolaClient } from '@hola/api-client'
import type { InferResponseType } from 'hono/client'
import { env } from './env.ts'

/**
 * Client untuk endpoint publik yang dipanggil dari Server Component.
 * Tidak pernah membawa sesi: `apiClient` di browser yang mengurus token.
 */
export const serverApi: HolaClient = createHolaClient({
  baseUrl: env.API_BASE_URL_INTERNAL ?? env.NEXT_PUBLIC_API_BASE_URL,
  getAccessToken: () => null,
  onUnauthorized: () => undefined,
})

type SportListResponse = InferResponseType<typeof serverApi.api.v1.sports.$get, 200>
type CourtListResponse = InferResponseType<typeof serverApi.api.v1.courts.$get, 200>
type CourtDetailResponse = InferResponseType<(typeof serverApi.api.v1.courts)[':id']['$get'], 200>

export type Sport = SportListResponse['data'][number]
export type Court = CourtListResponse['data'][number]
export type CourtDetail = CourtDetailResponse['data']

/** ISR 5 menit: data lapangan berubah lewat admin, bukan per detik. */
const PUBLIC_REVALIDATE = { next: { revalidate: 300 } } as const

export async function fetchSports(): Promise<Sport[]> {
  const response = await serverApi.api.v1.sports.$get(undefined, { init: PUBLIC_REVALIDATE })
  if (!response.ok) return []
  const body = await response.json()
  return body.data
}

export async function fetchCourts(filter: { sportId?: string } = {}): Promise<Court[]> {
  const response = await serverApi.api.v1.courts.$get(
    { query: { status: 'active', ...(filter.sportId ? { sport_id: filter.sportId } : {}) } },
    { init: PUBLIC_REVALIDATE },
  )
  if (!response.ok) return []
  const body = await response.json()
  return body.data
}

/** `null` berarti 404 — halaman pemanggil memanggil `notFound()`. */
export async function fetchCourtDetail(courtId: string): Promise<CourtDetail | null> {
  const response = await serverApi.api.v1.courts[':id'].$get(
    { param: { id: courtId } },
    { init: PUBLIC_REVALIDATE },
  )
  if (!response.ok) return null
  const body = await response.json()
  return body.data
}

/** URL publik objek media; `object_key` selalu relatif terhadap bucket. */
export function mediaUrl(objectKey: string): string {
  return `${env.NEXT_PUBLIC_MEDIA_BASE_URL.replace(/\/+$/, '')}/${objectKey}`
}
```

- [ ] **Step 7: Tulis pembaca config publik**

Buat `apps/web/src/lib/public-config.ts`:

```ts
import type { InferResponseType } from 'hono/client'
import { serverApi } from './server-api.ts'

type PublicConfigResponse = InferResponseType<typeof serverApi.api.v1.config.public.$get, 200>
export type PublicConfig = PublicConfigResponse['data']

/**
 * `server_time` berubah tiap permintaan, jadi tidak boleh di-ISR — countdown hold
 * bergantung padanya (E-23).
 */
export async function fetchPublicConfig(): Promise<PublicConfig> {
  const response = await serverApi.api.v1.config.public.$get(undefined, {
    init: { cache: 'no-store' },
  })
  if (!response.ok) throw new Error('Konfigurasi publik tidak dapat dimuat.')
  const body = await response.json()
  return body.data
}
```

Buat juga `apps/web/src/lib/server-time.ts` — modul murni terpisah:

```ts
/**
 * Selisih jam peladen dengan jam klien (E-23). Sengaja tidak diletakkan di
 * `public-config.ts`: berkas itu mengimpor `serverApi` yang membaca `process.env`,
 * dan komponen klien yang mengimpornya akan menarik kode peladen ke bundle browser.
 */
export function serverTimeOffsetMs(serverTime: string, clientNow: number): number {
  return new Date(serverTime).getTime() - clientNow
}
```

- [ ] **Step 8: Verifikasi**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test`
Expected: PASS. Kalau typecheck mengeluh `Property 'sports' does not exist`, berarti Task 1 belum ter-merge — selesaikan Fase A dulu.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/server-api.ts apps/web/src/lib/format.ts \
  apps/web/src/lib/public-config.ts apps/web/src/lib/format.test.ts \
  apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add server data layer and formatters"
```

---

### Task 9: Kerangka situs + landing

**Files:**
- Create: `apps/web/src/components/layout/SiteHeader.tsx`
- Create: `apps/web/src/components/layout/SiteFooter.tsx`
- Create: `apps/web/src/components/court/CourtCard.tsx`
- Create: `apps/web/src/app/(public)/layout.tsx`
- Modify: `apps/web/src/app/(public)/page.tsx`

**Interfaces:**
- Consumes: `fetchSports`, `fetchCourts`, `mediaUrl`, `type Court`, `type Sport` dari Task 8; `Button`, `Card`, `Badge` dari Task 5
- Produces: `CourtCard` dengan prop `{ court: Court; photoKey: string | null }`

- [ ] **Step 1: Tulis header**

Buat `apps/web/src/components/layout/SiteHeader.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '../ui/button.tsx'

export function SiteHeader(): ReactNode {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4"
        aria-label="Navigasi utama"
      >
        <Link href="/" className="font-display text-xl font-bold text-primary">
          Hola
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/lapangan">Lapangan</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/info">Info</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/akun/booking">Booking Saya</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
```

- [ ] **Step 2: Tulis footer**

Buat `apps/web/src/components/layout/SiteFooter.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

export function SiteFooter(): ReactNode {
  return (
    <footer className="mt-24 border-t bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-primary">Hola Sports Center</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Pusat olahraga di Balikpapan. Pesan lapangan online, bayar langsung, main tanpa ribet.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Tautan</p>
          <ul className="mt-2 grid gap-1.5 text-muted-foreground">
            <li>
              <Link className="hover:text-primary" href="/lapangan">
                Daftar lapangan
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="/info">
                Jam operasional & lokasi
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="/akun/booking">
                Booking saya
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground">Kontak</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Balikpapan, Kalimantan Timur
          </p>
        </div>
      </div>
    </footer>
  )
}
```

Alamat dan nomor telepon yang sebenarnya diisi di P1-93 saat pengisian data produksi. Jangan mengarang nomor telepon di sini.

- [ ] **Step 3: Tulis layout publik**

Buat `apps/web/src/app/(public)/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { SiteFooter } from '../../components/layout/SiteFooter.tsx'
import { SiteHeader } from '../../components/layout/SiteHeader.tsx'

interface PublicLayoutProps {
  children: ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps): ReactNode {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  )
}
```

Halaman auth berada di grup `(public)` yang sama tetapi memakai `AuthCard` sebagai `<main>` sendiri. Setelah menambahkan layout ini, buka `/login` dan pastikan header muncul di atas kartu — kalau tampilannya jadi aneh, pindahkan kelima halaman auth ke grup rute `(auth)` dengan layout kosongnya sendiri.

- [ ] **Step 4: Tulis kartu lapangan**

Buat `apps/web/src/components/court/CourtCard.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { type Court, mediaUrl } from '../../lib/server-api.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { Card, CardContent, CardFooter } from '../ui/card.tsx'

interface CourtCardProps {
  court: Court
  photoKey: string | null
}

export function CourtCard({ court, photoKey }: CourtCardProps): ReactNode {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted">
        {photoKey ? (
          <Image
            src={mediaUrl(photoKey)}
            alt={`Lapangan ${court.name}`}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        ) : null}
        <Badge className="absolute left-3 top-3" variant={court.is_indoor ? 'default' : 'secondary'}>
          {court.is_indoor ? 'Indoor' : 'Outdoor'}
        </Badge>
      </div>
      <CardContent className="pt-5">
        <h3 className="font-display text-xl font-bold text-foreground">{court.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {court.code}
          {court.surface ? ` · ${court.surface.replace(/_/g, ' ')}` : ''}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {court.slot_duration_minutes} menit per slot · {court.min_slots_per_booking}–
          {court.max_slots_per_booking} slot per booking
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/lapangan/${court.code}`}>Lihat ketersediaan</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
```

Kartu ini sengaja **tidak** menampilkan harga: harga bergantung `rate_class` per slot dan hanya diketahui setelah memanggil availability. Menampilkan "mulai dari" tanpa sumber berarti mengarang angka.

- [ ] **Step 5: Tulis landing**

Ganti seluruh isi `apps/web/src/app/(public)/page.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardContent } from '../../components/ui/card.tsx'
import { CourtCard } from '../../components/court/CourtCard.tsx'
import { fetchCourts, fetchSports } from '../../lib/server-api.ts'

export default async function HomePage(): Promise<ReactNode> {
  const [sports, courts] = await Promise.all([fetchSports(), fetchCourts()])
  const featured = courts.slice(0, 3)

  return (
    <main>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <Badge variant="accent" className="bg-accent/20 text-accent">
            Booking online Hola Sports Center
          </Badge>
          <h1 className="mt-6 max-w-2xl font-display text-5xl font-semibold leading-tight md:text-6xl">
            Pesan lapangan, <span className="text-accent">langsung main.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-primary-foreground/80">
            Lihat slot yang benar-benar kosong, kunci lewat pembayaran online, dan datang tanpa
            perlu menelepon lebih dulu.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/lapangan">Pesan lapangan</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/40 text-white">
              <Link href="/info">Jam operasional</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-foreground">Olahraga yang tersedia</h2>
        {sports.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Daftar olahraga sedang disiapkan.</p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            {sports.map((sport) => (
              <Button asChild key={sport.id} variant="secondary">
                <Link href={`/lapangan?olahraga=${sport.id}`}>{sport.name}</Link>
              </Button>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold text-foreground">Lapangan unggulan</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/lapangan">Lihat semua</Link>
          </Button>
        </div>
        {featured.length === 0 ? (
          <p className="mt-4 text-muted-foreground">Belum ada lapangan yang dapat dipesan.</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {featured.map((court) => (
              <CourtCard key={court.id} court={court} photoKey={null} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="font-display text-3xl font-bold text-foreground">Cara memesan</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            ['1', 'Pilih slot', 'Buka lapangan yang diinginkan dan pilih jam yang masih kosong.'],
            ['2', 'Bayar', 'Slot dikunci 10 menit sementara kamu menyelesaikan pembayaran.'],
            ['3', 'Datang & main', 'Bukti pemesanan masuk ke halaman Booking Saya.'],
          ].map(([step, title, description]) => (
            <Card key={step}>
              <CardContent className="pt-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground">
                  {step}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-foreground">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
```

`SessionStatus` tidak lagi dipakai di landing; tombol Masuk di header sudah menggantikannya. Biarkan berkasnya — ia masih dipakai untuk diagnosa sesi.

- [ ] **Step 6: Verifikasi**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web build`
Expected: PASS

- [ ] **Step 7: Periksa dengan mata**

Jalankan API (`pnpm dev`) lalu buka `http://localhost:3000/`. Pastikan hero biru dengan aksen lime, daftar olahraga terisi dari database, dan kartu lapangan muncul. Kalau daftar kosong padahal database terisi, periksa `API_BASE_URL_INTERNAL`.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/layout/ apps/web/src/components/court/ apps/web/src/app/\(public\)/
git commit -m "feat(web): add site shell and landing page"
```

---

### Task 10: Daftar & detail lapangan

**Files:**
- Create: `apps/web/src/app/(public)/lapangan/page.tsx`
- Create: `apps/web/src/app/(public)/lapangan/[kode]/page.tsx`
- Modify: `apps/web/src/lib/server-api.ts`

**Interfaces:**
- Consumes: `fetchCourts`, `fetchCourtDetail`, `fetchSports`, `mediaUrl`, `formatClock`, `formatDayName`
- Produces: `findCourtByCode(code: string): Promise<CourtDetail | null>` di `server-api.ts` — rute publik memakai `code` (mis. `PDL-01`) sebagai slug, sedangkan API mengambil UUID

- [ ] **Step 1: Tambah pencarian berdasarkan kode**

Tambahkan di `apps/web/src/lib/server-api.ts`:

```ts
/**
 * Slug publik memakai `code` yang enak dibaca, sedangkan API mengambil UUID.
 * Daftar court kecil (satu gedung), jadi memindai hasil `GET /courts` lebih
 * murah daripada menambah endpoint lookup baru.
 */
export async function findCourtByCode(code: string): Promise<CourtDetail | null> {
  const courts = await fetchCourts()
  const match = courts.find((court) => court.code.toLowerCase() === code.toLowerCase())
  if (!match) return null
  return fetchCourtDetail(match.id)
}
```

- [ ] **Step 2: Tulis halaman daftar**

Buat `apps/web/src/app/(public)/lapangan/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { CourtCard } from '../../../components/court/CourtCard.tsx'
import { Button } from '../../../components/ui/button.tsx'
import { fetchCourts, fetchSports } from '../../../lib/server-api.ts'

export const metadata: Metadata = {
  title: 'Daftar lapangan',
  description: 'Semua lapangan yang dapat dipesan di Hola Sports Center Balikpapan.',
}

interface CourtsPageProps {
  searchParams: Promise<{ olahraga?: string }>
}

export default async function CourtsPage({ searchParams }: CourtsPageProps): Promise<ReactNode> {
  const { olahraga } = await searchParams
  const [sports, courts] = await Promise.all([
    fetchSports(),
    fetchCourts(olahraga ? { sportId: olahraga } : {}),
  ])

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-foreground">Lapangan</h1>
      <p className="mt-2 text-muted-foreground">
        Pilih lapangan untuk melihat slot yang masih kosong.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant={olahraga ? 'ghost' : 'secondary'} size="sm">
          <Link href="/lapangan">Semua</Link>
        </Button>
        {sports.map((sport) => (
          <Button
            asChild
            key={sport.id}
            variant={olahraga === sport.id ? 'secondary' : 'ghost'}
            size="sm"
          >
            <Link href={`/lapangan?olahraga=${sport.id}`}>{sport.name}</Link>
          </Button>
        ))}
      </div>

      {courts.length === 0 ? (
        <p className="mt-12 rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Belum ada lapangan untuk pilihan ini.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {courts.map((court) => (
            <CourtCard key={court.id} court={court} photoKey={null} />
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Tulis halaman detail**

Buat `apps/web/src/app/(public)/lapangan/[kode]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { Badge } from '../../../../components/ui/badge.tsx'
import { formatClock, formatDayName } from '../../../../lib/format.ts'
import { findCourtByCode, mediaUrl } from '../../../../lib/server-api.ts'

interface CourtDetailPageProps {
  params: Promise<{ kode: string }>
}

export async function generateMetadata({ params }: CourtDetailPageProps): Promise<Metadata> {
  const { kode } = await params
  const court = await findCourtByCode(kode)
  if (!court) return { title: 'Lapangan tidak ditemukan' }
  return {
    title: court.name,
    description: court.description ?? `Ketersediaan dan harga slot ${court.name}.`,
  }
}

export default async function CourtDetailPage({ params }: CourtDetailPageProps): Promise<ReactNode> {
  const { kode } = await params
  const court = await findCourtByCode(kode)
  if (!court) notFound()

  const cover = court.photos[0]

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
          {cover ? (
            <Image
              src={mediaUrl(cover.object_key)}
              alt={`Lapangan ${court.name}`}
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
              priority
            />
          ) : null}
        </div>
        <div>
          <Badge variant={court.is_indoor ? 'default' : 'secondary'}>
            {court.is_indoor ? 'Indoor' : 'Outdoor'}
          </Badge>
          <h1 className="mt-4 font-display text-4xl font-bold text-foreground">{court.name}</h1>
          <p className="mt-1 text-muted-foreground">{court.code}</p>
          {court.description ? (
            <p className="mt-4 leading-relaxed text-muted-foreground">{court.description}</p>
          ) : null}
          <dl className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">Durasi slot</dt>
              <dd className="font-semibold">{court.slot_duration_minutes} menit</dd>
            </div>
            <div className="flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">Slot per booking</dt>
              <dd className="font-semibold">
                {court.min_slots_per_booking}–{court.max_slots_per_booking}
              </dd>
            </div>
            {court.surface ? (
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground">Permukaan</dt>
                <dd className="font-semibold">{court.surface.replace(/_/g, ' ')}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-foreground">Jam operasional</h2>
        {court.operating_hours.length === 0 ? (
          <p className="mt-3 text-muted-foreground">Jam operasional belum diatur.</p>
        ) : (
          <ul className="mt-4 grid gap-2 md:max-w-md">
            {court.operating_hours.map((hour) => (
              <li key={hour.day_of_week} className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{formatDayName(hour.day_of_week)}</span>
                <span className="font-semibold">
                  {formatClock(hour.opens_time)}–{formatClock(hour.closes_time)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="ketersediaan" className="mt-12">
        <h2 className="font-display text-2xl font-bold text-foreground">Ketersediaan</h2>
        <p className="mt-3 text-muted-foreground">Grid ketersediaan dipasang pada Task 12.</p>
      </section>
    </main>
  )
}
```

Bagian `#ketersediaan` sengaja berupa penampung; Task 12 menggantinya dengan komponen sungguhan.

- [ ] **Step 4: Verifikasi**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web build`
Expected: PASS

- [ ] **Step 5: Periksa dengan mata**

Buka `/lapangan`, klik satu kartu, pastikan URL memakai kode lapangan (mis. `/lapangan/PDL-01`) dan jam operasional tampil. Buka `/lapangan/tidak-ada` dan pastikan muncul halaman 404 bawaan Next.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(public\)/lapangan/ apps/web/src/lib/server-api.ts
git commit -m "feat(web): add court list and detail pages"
```

---

### Task 11: Halaman info + SEO

**Files:**
- Create: `apps/web/src/app/(public)/info/page.tsx`
- Create: `apps/web/src/app/sitemap.ts`
- Create: `apps/web/src/app/opengraph-image.tsx`
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**
- Consumes: `fetchCourts`, `fetchPublicConfig`, `formatClock`, `formatDayName`, `env.NEXT_PUBLIC_WEB_BASE_URL`
- Produces: `sitemap(): Promise<MetadataRoute.Sitemap>` yang memuat rute statis + satu entri per lapangan aktif

- [ ] **Step 1: Tulis halaman info**

Buat `apps/web/src/app/(public)/info/page.tsx`:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { formatClock, formatDayName } from '../../../lib/format.ts'
import { fetchPublicConfig } from '../../../lib/public-config.ts'
import { fetchCourtDetail, fetchCourts } from '../../../lib/server-api.ts'

export const metadata: Metadata = {
  title: 'Jam operasional, lokasi & kontak',
  description: 'Jam buka, lokasi, kontak, dan kebijakan pembatalan Hola Sports Center.',
}

export default async function InfoPage(): Promise<ReactNode> {
  const [courts, config] = await Promise.all([fetchCourts(), fetchPublicConfig()])
  const details = await Promise.all(courts.map((court) => fetchCourtDetail(court.id)))

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-foreground">Info</h1>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-foreground">Jam operasional</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {details.filter((detail) => detail !== null).map((detail) => (
            <div key={detail.id} className="rounded-xl border bg-card p-5">
              <p className="font-semibold text-foreground">{detail.name}</p>
              <ul className="mt-3 grid gap-1.5 text-sm">
                {detail.operating_hours.map((hour) => (
                  <li key={hour.day_of_week} className="flex justify-between">
                    <span className="text-muted-foreground">{formatDayName(hour.day_of_week)}</span>
                    <span className="font-semibold">
                      {formatClock(hour.opens_time)}–{formatClock(hour.closes_time)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-foreground">Kebijakan pembatalan</h2>
        <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
          {config.cancellation_policy_text ?? 'Kebijakan pembatalan sedang disiapkan.'}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold text-foreground">Lokasi & kontak</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Hola Sports Center, Balikpapan, Kalimantan Timur.
        </p>
      </section>
    </main>
  )
}
```

Alamat lengkap, peta, dan nomor kontak diisi di P1-93 dari data client. Jangan mengisinya dengan tebakan.

- [ ] **Step 2: Tulis sitemap**

Buat `apps/web/src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'
import { env } from '../lib/env.ts'
import { fetchCourts } from '../lib/server-api.ts'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_WEB_BASE_URL.replace(/\/+$/, '')
  const courts = await fetchCourts()

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/lapangan`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/info`, changeFrequency: 'monthly', priority: 0.6 },
    ...courts.map((court) => ({
      url: `${base}/lapangan/${court.code}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ]
}
```

Rute terproteksi (`/checkout`, `/booking/*`, `/akun/*`) sengaja tidak masuk sitemap.

- [ ] **Step 3: Tulis OG image**

Buat `apps/web/src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og'

export const alt = 'Hola Sports Center — pesan lapangan online'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: '#1565c0',
        color: '#ffffff',
        padding: 80,
      }}
    >
      <div style={{ fontSize: 32, color: '#96f535', letterSpacing: 4 }}>HOLA SPORTS CENTER</div>
      <div style={{ fontSize: 88, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>
        Pesan lapangan,
      </div>
      <div style={{ fontSize: 88, fontWeight: 700, color: '#96f535', lineHeight: 1.1 }}>
        langsung main.
      </div>
      <div style={{ fontSize: 30, marginTop: 32, color: 'rgba(255,255,255,0.8)' }}>
        Balikpapan · booking online
      </div>
    </div>,
    size,
  )
}
```

Font kustom tidak dipakai di OG image; `next/og` menjalankan Satori yang butuh berkas font ter-embed, dan sistem font bawaannya sudah memadai untuk gambar statis ini.

- [ ] **Step 4: Lengkapi metadata root**

Di `apps/web/src/app/layout.tsx`, ganti objek `metadata`:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_WEB_BASE_URL),
  title: {
    default: 'Hola Sports Center — pesan lapangan online',
    template: '%s | Hola Sports Center',
  },
  description:
    'Pesan lapangan olahraga di Balikpapan secara online: lihat slot kosong, bayar, dan langsung main.',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'Hola Sports Center',
  },
}
```

Tambahkan `import { env } from '../lib/env.ts'`.

- [ ] **Step 5: Verifikasi**

```bash
pnpm --filter @hola/web typecheck
pnpm --filter @hola/web build
```

Expected: PASS. Jalankan `pnpm --filter @hola/web dev` lalu periksa `http://localhost:3000/sitemap.xml` memuat entri per lapangan, dan `http://localhost:3000/opengraph-image` menghasilkan gambar biru.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/
git commit -m "feat(web): add info page, sitemap, and og image"
```

---

# Fase D — Alur booking

### Task 12: Grid ketersediaan 🔒

**Files:**
- Create: `apps/web/src/components/booking/availability-labels.ts`
- Create: `apps/web/src/components/booking/AvailabilityGrid.tsx`
- Test: `apps/web/src/components/booking/availability-labels.test.ts`
- Test: `apps/web/src/components/booking/AvailabilityGrid.test.tsx`
- Modify: `apps/web/src/lib/format.ts`
- Modify: `apps/web/src/lib/format.test.ts`
- Modify: `apps/web/src/app/(public)/lapangan/[kode]/page.tsx`

**Interfaces:**
- Consumes: `apiClient`, `formatRupiah`, `formatTimeWita`, `PublicConfig`
- Produces:
  - `type AvailabilitySlot`, `type AvailabilityDay` diturunkan dari response API
  - `unavailableLabel(reason: string | null): string`
  - `isBeyondHorizon(warnings: readonly { code: string }[] | undefined): boolean`
  - `witaDateKey(iso: string): string` di `format.ts` — `yyyy-mm-dd` zona WITA
  - `AvailabilityGrid` dengan prop `{ courtId: string; horizonDays: number; serverTime: string; onSelectionChange: (slots: AvailabilitySlot[]) => void }`

- [ ] **Step 1: Tulis test label yang gagal**

Buat `apps/web/src/components/booking/availability-labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isBeyondHorizon, unavailableLabel } from './availability-labels.ts'

describe('label ketersediaan', () => {
  it('P1-73: booking, event, dan match digabung agar identitas pemesan tidak bocor', () => {
    expect(unavailableLabel('booking')).toBe('Sudah dipesan')
    expect(unavailableLabel('event')).toBe('Sudah dipesan')
    expect(unavailableLabel('match')).toBe('Sudah dipesan')
  })

  it('P1-73: alasan operasional punya label sendiri', () => {
    expect(unavailableLabel('maintenance')).toBe('Perawatan')
    expect(unavailableLabel('closed')).toBe('Tutup')
    expect(unavailableLabel('past')).toBe('Sudah lewat')
    expect(unavailableLabel('beyond_horizon')).toBe('Belum dibuka')
  })

  it('P1-73: alasan tak dikenal tidak menampilkan kode mentah ke customer', () => {
    expect(unavailableLabel('sesuatu_yang_baru')).toBe('Tidak tersedia')
    expect(unavailableLabel(null)).toBe('Tidak tersedia')
  })

  it('E-11: peringatan horizon terdeteksi tanpa melempar saat meta kosong', () => {
    expect(isBeyondHorizon([{ code: 'BEYOND_BOOKING_HORIZON' }])).toBe(true)
    expect(isBeyondHorizon([{ code: 'PRICE_CHANGED' }])).toBe(false)
    expect(isBeyondHorizon(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/web exec vitest run src/components/booking/availability-labels.test.ts`
Expected: FAIL — modul tidak ada

- [ ] **Step 3: Tulis modul label**

Buat `apps/web/src/components/booking/availability-labels.ts`:

```ts
/**
 * `booking`, `event`, dan `match` sengaja menghasilkan label yang sama.
 * Response ketersediaan tidak memuat identitas pemesan (docs/06 § 5.2), dan
 * membedakan ketiganya tidak menambah nilai bagi customer.
 */
const LABELS: Record<string, string> = {
  booking: 'Sudah dipesan',
  event: 'Sudah dipesan',
  match: 'Sudah dipesan',
  maintenance: 'Perawatan',
  closed: 'Tutup',
  past: 'Sudah lewat',
  beyond_horizon: 'Belum dibuka',
}

export function unavailableLabel(reason: string | null): string {
  if (reason === null) return 'Tidak tersedia'
  return LABELS[reason] ?? 'Tidak tersedia'
}

/** E-11: hari di luar horizon tetap `200`; UI menerangkan, tidak menampilkan error. */
export function isBeyondHorizon(warnings: readonly { code: string }[] | undefined): boolean {
  return (warnings ?? []).some((warning) => warning.code === 'BEYOND_BOOKING_HORIZON')
}
```

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/web exec vitest run src/components/booking/availability-labels.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Tambah `witaDateKey` beserta testnya**

Tambahkan di `apps/web/src/lib/format.ts`:

```ts
const dateKeyWita = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** `yyyy-mm-dd` menurut WITA — tanggal bisnis booking (BR-B-01). */
export function witaDateKey(iso: string): string {
  return dateKeyWita.format(new Date(iso))
}
```

Tambahkan di `apps/web/src/lib/format.test.ts`, di dalam `describe` yang ada:

```ts
  it('BR-B-01: tanggal bisnis dihitung di WITA, bukan zona peladen', () => {
    expect(witaDateKey('2026-07-28T23:00:00+08:00')).toBe('2026-07-28')
    expect(witaDateKey('2026-07-28T16:30:00Z')).toBe('2026-07-29')
  })
```

Tambahkan `witaDateKey` ke daftar import di berkas test.

Run: `pnpm --filter @hola/web exec vitest run src/lib/format.test.ts`
Expected: PASS (5 test)

- [ ] **Step 6: Tulis test grid yang gagal**

Buat `apps/web/src/components/booking/AvailabilityGrid.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AvailabilityGrid } from './AvailabilityGrid.tsx'

const day = {
  court_code: 'PDL-01',
  date: '2026-08-10',
  slot_duration_minutes: 60,
  day_type: 'weekday',
  slots: [
    {
      starts_at: '2026-08-10T06:00:00+08:00',
      ends_at: '2026-08-10T07:00:00+08:00',
      is_available: true,
      unavailable_reason: null,
      rate_class: 'offpeak',
      price_amount: 150000,
    },
    {
      starts_at: '2026-08-10T19:00:00+08:00',
      ends_at: '2026-08-10T20:00:00+08:00',
      is_available: false,
      unavailable_reason: 'booking',
      rate_class: 'peak',
      price_amount: 250000,
    },
  ],
}

function mockAvailability(warnings: { code: string }[] = []): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        data: { court_id: 'court-1', days: [day] },
        meta: { generated_at: '2026-08-08T10:00:00+08:00', warnings },
      }),
    ),
  )
}

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AvailabilityGrid', () => {
  it('P1-73: slot terisi disabled dan menampilkan label alasan', async () => {
    mockAvailability()
    render(
      <AvailabilityGrid
        courtId="court-1"
        horizonDays={14}
        serverTime="2026-08-08T10:00:00+08:00"
        onSelectionChange={() => undefined}
      />,
      { wrapper },
    )

    const taken = await screen.findByRole('button', { name: /19\.00/ })
    expect(taken.hasAttribute('disabled')).toBe(true)
    expect(taken.textContent).toContain('Sudah dipesan')
  })

  it('P1-73: slot tersedia dapat dipilih dan melaporkan pilihannya', async () => {
    mockAvailability()
    const onSelectionChange = vi.fn()
    render(
      <AvailabilityGrid
        courtId="court-1"
        horizonDays={14}
        serverTime="2026-08-08T10:00:00+08:00"
        onSelectionChange={onSelectionChange}
      />,
      { wrapper },
    )

    await userEvent.click(await screen.findByRole('button', { name: /06\.00/ }))

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith([
        expect.objectContaining({ starts_at: '2026-08-10T06:00:00+08:00' }),
      ])
    })
  })

  it('E-11: peringatan horizon menampilkan keterangan, bukan error', async () => {
    mockAvailability([{ code: 'BEYOND_BOOKING_HORIZON' }])
    render(
      <AvailabilityGrid
        courtId="court-1"
        horizonDays={14}
        serverTime="2026-08-08T10:00:00+08:00"
        onSelectionChange={() => undefined}
      />,
      { wrapper },
    )

    expect(await screen.findByText(/Belum dibuka untuk pemesanan/)).toBeDefined()
  })

  it('P1-73: waktu pembuatan data ditampilkan agar customer tahu kesegarannya', async () => {
    mockAvailability()
    render(
      <AvailabilityGrid
        courtId="court-1"
        horizonDays={14}
        serverTime="2026-08-08T10:00:00+08:00"
        onSelectionChange={() => undefined}
      />,
      { wrapper },
    )

    expect(await screen.findByText(/Diperbarui 10\.00/)).toBeDefined()
  })
})
```

- [ ] **Step 7: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/web exec vitest run src/components/booking/AvailabilityGrid.test.tsx`
Expected: FAIL — modul `./AvailabilityGrid.tsx` tidak ada

- [ ] **Step 8: Tulis grid**

Buat `apps/web/src/components/booking/AvailabilityGrid.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { cn } from '../../lib/cn.ts'
import { formatRupiah, formatTimeWita, witaDateKey } from '../../lib/format.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { Skeleton } from '../ui/skeleton.tsx'
import { isBeyondHorizon, unavailableLabel } from './availability-labels.ts'

type AvailabilityResponse = InferResponseType<
  (typeof apiClient.api.v1.courts)[':court_id']['availability']['$get'],
  200
>
export type AvailabilityDay = AvailabilityResponse['data']['days'][number]
export type AvailabilitySlot = AvailabilityDay['slots'][number]

interface AvailabilityGridProps {
  courtId: string
  horizonDays: number
  serverTime: string
  onSelectionChange: (slots: AvailabilitySlot[]) => void
}

function dateOptions(serverTime: string, horizonDays: number): string[] {
  const start = new Date(serverTime)
  const span = Math.min(horizonDays, 14)
  return Array.from({ length: span }, (_, index) => {
    const date = new Date(start)
    date.setDate(date.getDate() + index)
    return witaDateKey(date.toISOString())
  })
}

export function AvailabilityGrid({
  courtId,
  horizonDays,
  serverTime,
  onSelectionChange,
}: AvailabilityGridProps): ReactNode {
  const dates = useMemo(() => dateOptions(serverTime, horizonDays), [serverTime, horizonDays])
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? witaDateKey(serverTime))
  const [selected, setSelected] = useState<AvailabilitySlot[]>([])

  const query = useQuery({
    queryKey: ['availability', courtId, selectedDate],
    // 60 detik menyamai TTL cache Redis di peladen (BR-B-41).
    staleTime: 60_000,
    queryFn: async () => {
      const response = await apiClient.api.v1.courts[':court_id'].availability.$get({
        param: { court_id: courtId },
        query: { date: selectedDate },
      })
      if (!response.ok) throw new Error('Ketersediaan tidak dapat dimuat.')
      return response.json()
    },
  })

  useEffect(() => {
    onSelectionChange(selected)
  }, [selected, onSelectionChange])

  // Ganti tanggal berarti mulai memilih dari nol: satu booking hanya boleh satu tanggal.
  useEffect(() => {
    setSelected([])
  }, [selectedDate])

  const toggle = (slot: AvailabilitySlot): void => {
    setSelected((current) =>
      current.some((item) => item.starts_at === slot.starts_at)
        ? current.filter((item) => item.starts_at !== slot.starts_at)
        : [...current, slot],
    )
  }

  const day = query.data?.data.days[0]
  const beyondHorizon = isBeyondHorizon(query.data?.meta?.warnings)

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Pilih tanggal">
        {dates.map((date) => (
          <Button
            key={date}
            size="sm"
            variant={date === selectedDate ? 'default' : 'outline'}
            onClick={() => setSelectedDate(date)}
          >
            {date.slice(8)}/{date.slice(5, 7)}
          </Button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {query.data?.meta?.generated_at
            ? `Diperbarui ${formatTimeWita(query.data.meta.generated_at)}`
            : 'Memuat ketersediaan…'}
        </p>
        <Button size="sm" variant="ghost" onClick={() => void query.refetch()}>
          <RefreshCw size={16} /> Segarkan
        </Button>
      </div>

      {query.isPending ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <p className="mt-4 rounded-xl bg-destructive/10 p-4 text-destructive">
          Ketersediaan tidak dapat dimuat. Coba segarkan.
        </p>
      ) : null}

      {beyondHorizon ? (
        <p className="mt-4 rounded-xl bg-secondary p-4 text-secondary-foreground">
          Belum dibuka untuk pemesanan. Pilih tanggal yang lebih dekat.
        </p>
      ) : null}

      {day && !beyondHorizon ? (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {day.slots.map((slot) => {
            const isSelected = selected.some((item) => item.starts_at === slot.starts_at)
            return (
              <button
                key={slot.starts_at}
                type="button"
                disabled={!slot.is_available}
                onClick={() => toggle(slot)}
                aria-pressed={isSelected}
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  slot.is_available
                    ? 'bg-card hover:border-primary'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                  isSelected && 'border-primary bg-secondary ring-2 ring-primary',
                )}
              >
                <span className="block font-display text-lg font-bold">
                  {formatTimeWita(slot.starts_at)}
                </span>
                {slot.is_available ? (
                  <>
                    <Badge variant="outline" className="mt-1">
                      {slot.rate_class}
                    </Badge>
                    <span className="mt-2 block font-semibold">
                      {formatRupiah(slot.price_amount)}
                    </span>
                  </>
                ) : (
                  <span className="mt-2 block text-sm">
                    {unavailableLabel(slot.unavailable_reason)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 9: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/web exec vitest run src/components/booking/`
Expected: PASS (8 test)

- [ ] **Step 10: Tarik-untuk-menyegarkan**

Tambahkan di dalam `AvailabilityGrid`, sebelum `return`:

```tsx
  const [pullStartY, setPullStartY] = useState<number | null>(null)

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>): void => {
    if (window.scrollY > 0) return
    setPullStartY(event.touches[0]?.clientY ?? null)
  }

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>): void => {
    const endY = event.changedTouches[0]?.clientY ?? 0
    // 80 px cukup jauh untuk membedakan tarikan sengaja dari gulir biasa.
    if (pullStartY !== null && endY - pullStartY > 80) void query.refetch()
    setPullStartY(null)
  }
```

Bungkus elemen `<div>` terluar pada `return` dengan `onTouchStart={onTouchStart}` dan `onTouchEnd={onTouchEnd}`. Tambahkan `import type React from 'react'` bila typecheck memintanya.

- [ ] **Step 11: Pasang di halaman detail**

Di `apps/web/src/app/(public)/lapangan/[kode]/page.tsx`, ganti seksi `#ketersediaan` dengan komponen klien pembungkus. Buat `apps/web/src/components/booking/CourtAvailabilitySection.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { Button } from '../ui/button.tsx'
import { type AvailabilitySlot, AvailabilityGrid } from './AvailabilityGrid.tsx'

interface CourtAvailabilitySectionProps {
  courtId: string
  horizonDays: number
  serverTime: string
}

export function CourtAvailabilitySection({
  courtId,
  horizonDays,
  serverTime,
}: CourtAvailabilitySectionProps): ReactNode {
  const router = useRouter()
  const [selected, setSelected] = useState<AvailabilitySlot[]>([])
  const onSelectionChange = useCallback((slots: AvailabilitySlot[]) => setSelected(slots), [])

  const goToCheckout = (): void => {
    const slots = selected.map((slot) => slot.starts_at).join(',')
    router.push(`/checkout?court=${courtId}&slots=${encodeURIComponent(slots)}`)
  }

  return (
    <>
      <AvailabilityGrid
        courtId={courtId}
        horizonDays={horizonDays}
        serverTime={serverTime}
        onSelectionChange={onSelectionChange}
      />
      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">{selected.length} slot dipilih</p>
        <Button disabled={selected.length === 0} onClick={goToCheckout}>
          Lanjut ke checkout
        </Button>
      </div>
    </>
  )
}
```

Di halaman detail, panggil `fetchPublicConfig()` bersama `findCourtByCode` dan render:

```tsx
      <section id="ketersediaan" className="mt-12">
        <h2 className="font-display text-2xl font-bold text-foreground">Ketersediaan</h2>
        <div className="mt-4">
          <CourtAvailabilitySection
            courtId={court.id}
            horizonDays={config.booking_horizon_days}
            serverTime={config.server_time}
          />
        </div>
      </section>
```

Karena halaman kini memanggil `fetchPublicConfig` yang memakai `cache: 'no-store'`, tambahkan `export const dynamic = 'force-dynamic'` di halaman detail. Halaman daftar dan landing tetap ISR.

- [ ] **Step 12: Verifikasi**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test && pnpm --filter @hola/web build`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add apps/web/src/components/booking/ apps/web/src/lib/format.ts \
  apps/web/src/lib/format.test.ts apps/web/src/app/\(public\)/lapangan/
git commit -m "feat(web): add availability grid"
```

---

### Task 13: Checkout

**Files:**
- Create: `apps/web/src/components/booking/checkout-validation.ts`
- Create: `apps/web/src/components/booking/CheckoutForm.tsx`
- Create: `apps/web/src/components/booking/QuoteSummary.tsx`
- Create: `apps/web/src/app/checkout/page.tsx`
- Test: `apps/web/src/components/booking/checkout-validation.test.ts`

**Interfaces:**
- Consumes: `witaDateKey`, `formatRupiah`, `apiClient`, `fetchPublicConfig`
- Produces:
  - `type SelectedSlot = { courtId: string; startsAt: string }`
  - `type CourtLimits = { courtId: string; minSlots: number; maxSlots: number; slotDurationMinutes: number }`
  - `validateSelection(input: { slots: readonly SelectedSlot[]; limits: readonly CourtLimits[]; requireContiguousSlots: boolean }): { code: string; message: string } | null`
  - `QuoteSummary` dengan prop `{ quote: Quote }` (`Quote` dari `@hola/shared`) yang merender field quote apa adanya

- [ ] **Step 1: Tulis test validasi yang gagal**

Buat `apps/web/src/components/booking/checkout-validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateSelection } from './checkout-validation.ts'

const limits = [
  { courtId: 'court-1', minSlots: 1, maxSlots: 4, slotDurationMinutes: 60 },
  { courtId: 'court-2', minSlots: 2, maxSlots: 3, slotDurationMinutes: 60 },
]

function slot(courtId: string, startsAt: string): { courtId: string; startsAt: string } {
  return { courtId, startsAt }
}

describe('validasi pilihan checkout', () => {
  it('pilihan kosong ditolak', () => {
    expect(validateSelection({ slots: [], limits, requireContiguousSlots: false })?.code).toBe(
      'EMPTY_SELECTION',
    )
  })

  it('BR-B-01: slot lintas tanggal bisnis WITA ditolak', () => {
    const result = validateSelection({
      slots: [
        slot('court-1', '2026-08-10T22:00:00+08:00'),
        slot('court-1', '2026-08-11T06:00:00+08:00'),
      ],
      limits,
      requireContiguousSlots: false,
    })

    expect(result?.code).toBe('MIXED_BOOKING_DATE')
  })

  it('BR-B-02: batas jumlah slot dihitung per court', () => {
    const tooMany = validateSelection({
      slots: [
        slot('court-1', '2026-08-10T06:00:00+08:00'),
        slot('court-1', '2026-08-10T07:00:00+08:00'),
        slot('court-1', '2026-08-10T08:00:00+08:00'),
        slot('court-1', '2026-08-10T09:00:00+08:00'),
        slot('court-1', '2026-08-10T10:00:00+08:00'),
      ],
      limits,
      requireContiguousSlots: false,
    })
    expect(tooMany?.code).toBe('SLOT_COUNT_OUT_OF_RANGE')

    const tooFew = validateSelection({
      slots: [slot('court-2', '2026-08-10T06:00:00+08:00')],
      limits,
      requireContiguousSlots: false,
    })
    expect(tooFew?.code).toBe('SLOT_COUNT_OUT_OF_RANGE')
  })

  it('BR-B-09: kontiguitas hanya diperiksa saat setting menyala', () => {
    const gapped = [
      slot('court-1', '2026-08-10T06:00:00+08:00'),
      slot('court-1', '2026-08-10T08:00:00+08:00'),
    ]

    expect(validateSelection({ slots: gapped, limits, requireContiguousSlots: false })).toBeNull()
    expect(
      validateSelection({ slots: gapped, limits, requireContiguousSlots: true })?.code,
    ).toBe('SLOTS_NOT_CONTIGUOUS')
  })

  it('BR-B-09: slot berurutan lolos meski setting menyala', () => {
    const contiguous = [
      slot('court-1', '2026-08-10T06:00:00+08:00'),
      slot('court-1', '2026-08-10T07:00:00+08:00'),
    ]

    expect(validateSelection({ slots: contiguous, limits, requireContiguousSlots: true })).toBeNull()
  })

  it('court tanpa batas terdaftar ditolak alih-alih diloloskan diam-diam', () => {
    const result = validateSelection({
      slots: [slot('court-9', '2026-08-10T06:00:00+08:00')],
      limits,
      requireContiguousSlots: false,
    })

    expect(result?.code).toBe('UNKNOWN_COURT')
  })
})
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/web exec vitest run src/components/booking/checkout-validation.test.ts`
Expected: FAIL — modul tidak ada

- [ ] **Step 3: Tulis validator**

Buat `apps/web/src/components/booking/checkout-validation.ts`:

```ts
import { witaDateKey } from '../../lib/format.ts'

export interface SelectedSlot {
  courtId: string
  startsAt: string
}

export interface CourtLimits {
  courtId: string
  minSlots: number
  maxSlots: number
  slotDurationMinutes: number
}

export interface CheckoutValidationError {
  code: string
  message: string
}

export interface ValidateSelectionInput {
  slots: readonly SelectedSlot[]
  limits: readonly CourtLimits[]
  requireContiguousSlots: boolean
}

/**
 * Cermin aturan peladen (BR-B-01, BR-B-02, BR-B-09) supaya customer mendapat
 * umpan balik sebelum request. Peladen tetap penentu akhir — ini bukan
 * pengganti validasinya.
 */
export function validateSelection(
  input: ValidateSelectionInput,
): CheckoutValidationError | null {
  if (input.slots.length === 0) {
    return { code: 'EMPTY_SELECTION', message: 'Pilih minimal satu slot.' }
  }

  const dates = new Set(input.slots.map((slot) => witaDateKey(slot.startsAt)))
  if (dates.size > 1) {
    return {
      code: 'MIXED_BOOKING_DATE',
      message: 'Satu booking hanya boleh berisi slot pada satu tanggal.',
    }
  }

  const byCourt = new Map<string, SelectedSlot[]>()
  for (const slot of input.slots) {
    byCourt.set(slot.courtId, [...(byCourt.get(slot.courtId) ?? []), slot])
  }

  for (const [courtId, slots] of byCourt) {
    const limit = input.limits.find((item) => item.courtId === courtId)
    if (!limit) {
      return { code: 'UNKNOWN_COURT', message: 'Lapangan tidak dikenali. Muat ulang halaman.' }
    }
    if (slots.length < limit.minSlots || slots.length > limit.maxSlots) {
      return {
        code: 'SLOT_COUNT_OUT_OF_RANGE',
        message: `Pilih ${limit.minSlots}–${limit.maxSlots} slot untuk lapangan ini.`,
      }
    }
    if (!input.requireContiguousSlots) continue

    const sorted = [...slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    const stepMs = limit.slotDurationMinutes * 60_000
    for (let index = 1; index < sorted.length; index++) {
      const previous = new Date(sorted[index - 1]!.startsAt).getTime()
      const current = new Date(sorted[index]!.startsAt).getTime()
      if (current - previous !== stepMs) {
        return {
          code: 'SLOTS_NOT_CONTIGUOUS',
          message: 'Slot harus berurutan tanpa jeda.',
        }
      }
    }
  }

  return null
}
```

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/web exec vitest run src/components/booking/checkout-validation.test.ts`
Expected: PASS (6 test)

- [ ] **Step 5: Tulis ringkasan quote**

Buat `apps/web/src/components/booking/QuoteSummary.tsx`. Bentuk `Quote` didefinisikan di `packages/shared/src/types/quote.ts` dan diimpor langsung, bukan ditulis ulang. Komponen ini **hanya merender**; tidak ada satu pun operasi aritmetika di dalamnya (BR-B-12) — setiap total sudah dihitung peladen dan ditampilkan apa adanya.

```tsx
import type { Quote } from '@hola/shared'
import type { ReactNode } from 'react'
import { formatRupiah } from '../../lib/format.ts'

interface QuoteSummaryProps {
  quote: Quote
}

export function QuoteSummary({ quote }: QuoteSummaryProps): ReactNode {
  return (
    <dl className="grid gap-2">
      {quote.lines.map((line) => (
        <div key={`${line.type}-${line.ref_id}`} className="flex justify-between text-sm">
          <dt className="text-muted-foreground">
            {line.label}
            {line.quantity > 1 ? ` ×${line.quantity}` : ''}
          </dt>
          <dd className="font-semibold">{formatRupiah(line.line_total_amount)}</dd>
        </div>
      ))}

      <div className="mt-2 flex justify-between border-t pt-3 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="font-semibold">{formatRupiah(quote.subtotal_amount)}</dd>
      </div>
      {quote.addon_amount > 0 ? (
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">Addon</dt>
          <dd className="font-semibold">{formatRupiah(quote.addon_amount)}</dd>
        </div>
      ) : null}
      {quote.discount_amount > 0 ? (
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">
            Diskon{quote.promo ? ` (${quote.promo.code})` : ''}
          </dt>
          <dd className="font-semibold text-primary">−{formatRupiah(quote.discount_amount)}</dd>
        </div>
      ) : null}
      {quote.tax_amount > 0 ? (
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">Pajak</dt>
          <dd className="font-semibold">{formatRupiah(quote.tax_amount)}</dd>
        </div>
      ) : null}
      {quote.fee_amount > 0 ? (
        <div className="flex justify-between text-sm">
          <dt className="text-muted-foreground">Biaya layanan</dt>
          <dd className="font-semibold">{formatRupiah(quote.fee_amount)}</dd>
        </div>
      ) : null}

      <div className="mt-2 flex justify-between border-t pt-3">
        <dt className="font-display font-bold">Total</dt>
        <dd className="font-display text-xl font-bold text-primary">
          {formatRupiah(quote.total_amount)}
        </dd>
      </div>
    </dl>
  )
}
```

Perbandingan `> 0` di sini adalah keputusan tampilan (sembunyikan baris nol), bukan perhitungan harga — nilainya tetap datang jadi dari peladen.

- [ ] **Step 6: Tulis form checkout**

Buat `apps/web/src/components/booking/CheckoutForm.tsx`:

```tsx
'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatTimeWita } from '../../lib/format.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import { type CourtLimits, validateSelection } from './checkout-validation.ts'
import { QuoteSummary } from './QuoteSummary.tsx'
import { bookingIdempotencyKey, clearBookingIdempotencyKey } from './idempotency.ts'

interface CheckoutFormProps {
  courtId: string
  startsAtList: readonly string[]
  limits: readonly CourtLimits[]
  requireContiguousSlots: boolean
  cancellationPolicyText: string | null
}

export function CheckoutForm({
  courtId,
  startsAtList,
  limits,
  requireContiguousSlots,
  cancellationPolicyText,
}: CheckoutFormProps): ReactNode {
  const router = useRouter()
  const [promoCode, setPromoCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const slots = startsAtList.map((startsAt) => ({ courtId, startsAt }))
  const selectionError = validateSelection({ slots, limits, requireContiguousSlots })
  const items = startsAtList.map((startsAt) => ({ court_id: courtId, starts_at: startsAt }))

  const quote = useQuery({
    queryKey: ['quote', courtId, startsAtList, promoCode],
    enabled: selectionError === null,
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings.quote.$post({
        json: { items, addons: [], ...(promoCode ? { promo_code: promoCode } : {}) },
      })
      if (!response.ok) throw new Error('Harga tidak dapat dihitung.')
      return response.json()
    },
  })

  const createBooking = useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.v1.bookings.$post(
        { json: { items, addons: [], ...(promoCode ? { promo_code: promoCode } : {}) } },
        { headers: { 'Idempotency-Key': bookingIdempotencyKey(courtId, startsAtList) } },
      )
      if (response.status === 409) {
        const body = (await response.json()) as { error?: { code?: string } }
        throw new Error(body.error?.code ?? 'CONFLICT')
      }
      if (!response.ok) throw new Error('Booking gagal dibuat.')
      return response.json()
    },
    onSuccess: (body) => {
      clearBookingIdempotencyKey()
      router.push(`/booking/${body.data.id}`)
    },
    onError: (mutationError: Error) => {
      if (mutationError.message === 'SLOT_ALREADY_CLAIMED') {
        setError('Slot baru saja diambil orang lain. Pilih slot lain, ya.')
        router.push(`/lapangan?diambil=1`)
        return
      }
      if (mutationError.message === 'CONFLICT') {
        setError('Kamu punya 3 booking yang belum dibayar. Selesaikan dulu salah satunya.')
        router.push('/akun/booking?pending=1')
        return
      }
      setError(mutationError.message)
    },
  })

  return (
    <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
      <div>
        <h2 className="font-display text-2xl font-bold">Slot yang dipilih</h2>
        <ul className="mt-4 grid gap-2">
          {startsAtList.map((startsAt) => (
            <li key={startsAt} className="rounded-xl border bg-card px-4 py-3 font-semibold">
              {formatTimeWita(startsAt)}
            </li>
          ))}
        </ul>

        <div className="mt-6 grid gap-1.5">
          <Label htmlFor="promo">Kode promo</Label>
          <Input
            id="promo"
            value={promoCode}
            onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
            placeholder="Opsional"
          />
        </div>

        {cancellationPolicyText ? (
          <div className="mt-6 rounded-xl bg-secondary p-4">
            <p className="font-semibold text-secondary-foreground">Kebijakan pembatalan</p>
            <p className="mt-2 whitespace-pre-line text-sm text-secondary-foreground">
              {cancellationPolicyText}
            </p>
          </div>
        ) : null}
      </div>

      <aside className="h-fit rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl font-bold">Ringkasan</h2>
        {selectionError ? (
          <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">
            {selectionError.message}
          </p>
        ) : null}
        {quote.isPending && selectionError === null ? (
          <p className="mt-4 text-muted-foreground">Menghitung harga…</p>
        ) : null}
        {quote.data ? (
          <div className="mt-4">
            <QuoteSummary quote={quote.data.data} />
          </div>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>
        ) : null}
        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={selectionError !== null || !quote.data || createBooking.isPending}
          onClick={() => createBooking.mutate()}
        >
          {createBooking.isPending ? 'Mengunci slot…' : 'Kunci slot & bayar'}
        </Button>
      </aside>
    </div>
  )
}
```

`POST /bookings/quote` mengembalikan `ok(quote)` dengan `quote` bertipe `Quote` dari `@hola/shared`, jadi `quote.data.data` sudah bertipe benar tanpa cast.

- [ ] **Step 7: Tulis kunci idempotensi**

Buat `apps/web/src/components/booking/idempotency.ts`:

```ts
const STORAGE_KEY = 'hola.booking.idempotency'

function selectionSignature(courtId: string, startsAtList: readonly string[]): string {
  return `${courtId}|${[...startsAtList].sort().join(',')}`
}

/**
 * Satu kunci per percobaan checkout. Klik ganda atau refresh saat request masih
 * berjalan memakai kunci yang sama sehingga peladen tidak membuat booking kedua.
 * Kunci hanya berganti ketika pilihan slot berubah.
 */
export function bookingIdempotencyKey(
  courtId: string,
  startsAtList: readonly string[],
): string {
  const signature = selectionSignature(courtId, startsAtList)
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (stored) {
    const parsed = JSON.parse(stored) as { signature: string; key: string }
    if (parsed.signature === signature) return parsed.key
  }
  const key = crypto.randomUUID()
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, key }))
  return key
}

export function clearBookingIdempotencyKey(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
```

`crypto.randomUUID()` menghasilkan UUID v4, bukan v7. Peladen hanya memakai nilainya sebagai kunci idempotensi dan tidak mengurutkannya, jadi ini memenuhi kebutuhan. Kalau `Idempotency-Key` ditolak validasinya, periksa skema di `apps/api/src/middleware/idempotency.ts` dan sesuaikan.

- [ ] **Step 8: Tulis halaman checkout**

Buat `apps/web/src/app/checkout/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { CheckoutForm } from '../../components/booking/CheckoutForm.tsx'
import { RequireSession } from '../../components/common/RequireSession.tsx'
import { fetchPublicConfig } from '../../lib/public-config.ts'
import { fetchCourtDetail } from '../../lib/server-api.ts'

export const dynamic = 'force-dynamic'

interface CheckoutPageProps {
  searchParams: Promise<{ court?: string; slots?: string }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps): Promise<ReactNode> {
  const { court: courtId, slots } = await searchParams
  if (!courtId || !slots) notFound()

  const [court, config] = await Promise.all([fetchCourtDetail(courtId), fetchPublicConfig()])
  if (!court) notFound()

  return (
    <RequireSession>
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-foreground">Checkout</h1>
        <p className="mt-2 text-muted-foreground">{court.name}</p>
        <div className="mt-8">
          <CheckoutForm
            courtId={court.id}
            startsAtList={slots.split(',')}
            limits={[
              {
                courtId: court.id,
                minSlots: court.min_slots_per_booking,
                maxSlots: court.max_slots_per_booking,
                slotDurationMinutes: court.slot_duration_minutes,
              },
            ]}
            requireContiguousSlots={config.require_contiguous_slots}
            cancellationPolicyText={config.cancellation_policy_text}
          />
        </div>
      </main>
    </RequireSession>
  )
}
```

**Prasyarat urutan:** `RequireSession` didefinisikan di Task 16 Step 1–4. Kerjakan keempat langkah itu (test, komponen, dan verifikasinya) **sebelum** Task 13 Step 8. Jangan membuat versi sementara yang merender `children` apa adanya — halaman checkout tanpa penjaga akan memanggil `POST /bookings` tanpa sesi dan gagal dengan `401` yang membingungkan.

- [ ] **Step 9: Verifikasi**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/booking/ apps/web/src/app/checkout/
git commit -m "feat(web): add checkout with server-side quote"
```

---

### Task 14: Countdown hold

**Files:**
- Create: `apps/web/src/components/booking/hold-countdown.ts`
- Create: `apps/web/src/components/booking/HoldCountdown.tsx`
- Create: `apps/web/src/app/booking/[id]/page.tsx`
- Test: `apps/web/src/components/booking/hold-countdown.test.ts`
- Test: `apps/web/src/components/booking/HoldCountdown.test.tsx`

**Interfaces:**
- Consumes: `serverTimeOffsetMs` dari `src/lib/server-time.ts`
- Produces:
  - `remainingMs(holdExpiresAt: string, clientNow: number, offsetMs: number): number`
  - `formatRemaining(ms: number): string` — `mm:ss`, tidak pernah negatif
  - `HoldCountdown` dengan prop `{ holdExpiresAt: string; offsetMs: number; onExpired: () => void }`

- [ ] **Step 1: Tulis test yang gagal**

Buat `apps/web/src/components/booking/hold-countdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatRemaining, remainingMs } from './hold-countdown.ts'

const holdExpiresAt = '2026-08-10T06:10:00+08:00'
/** Jam peladen: 6 menit tersisa. */
const serverNowMs = new Date('2026-08-10T06:04:00+08:00').getTime()

describe('countdown hold', () => {
  it('E-23: jam klien yang meleset 5 menit tidak mengubah sisa waktu', () => {
    const clientNow = serverNowMs - 5 * 60_000
    const offsetMs = serverNowMs - clientNow

    expect(remainingMs(holdExpiresAt, clientNow, offsetMs)).toBe(6 * 60_000)
  })

  it('E-23: jam klien yang mendahului juga dikoreksi', () => {
    const clientNow = serverNowMs + 5 * 60_000
    const offsetMs = serverNowMs - clientNow

    expect(remainingMs(holdExpiresAt, clientNow, offsetMs)).toBe(6 * 60_000)
  })

  it('offset nol berarti jam klien dipercaya apa adanya', () => {
    expect(remainingMs(holdExpiresAt, serverNowMs, 0)).toBe(6 * 60_000)
  })

  it('hold yang sudah lewat tidak menghasilkan angka negatif', () => {
    const afterExpiry = new Date('2026-08-10T06:20:00+08:00').getTime()

    expect(remainingMs(holdExpiresAt, afterExpiry, 0)).toBe(0)
  })

  it('format mm:ss dengan nol di depan', () => {
    expect(formatRemaining(9 * 60_000 + 5_000)).toBe('09:05')
    expect(formatRemaining(0)).toBe('00:00')
    expect(formatRemaining(600_000)).toBe('10:00')
  })
})
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/web exec vitest run src/components/booking/hold-countdown.test.ts`
Expected: FAIL — modul tidak ada

- [ ] **Step 3: Tulis perhitungan**

Buat `apps/web/src/components/booking/hold-countdown.ts`:

```ts
/**
 * Sisa hold dihitung dari jam peladen, bukan jam perangkat (E-23).
 * `offsetMs` adalah `server_time − Date.now()` saat konfigurasi dimuat.
 */
export function remainingMs(holdExpiresAt: string, clientNow: number, offsetMs: number): number {
  const expiresAt = new Date(holdExpiresAt).getTime()
  return Math.max(0, expiresAt - (clientNow + offsetMs))
}

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
```

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/web exec vitest run src/components/booking/hold-countdown.test.ts`
Expected: PASS (5 test)

- [ ] **Step 5: Tulis test komponen yang gagal**

Buat `apps/web/src/components/booking/HoldCountdown.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HoldCountdown } from './HoldCountdown.tsx'

const holdExpiresAt = '2026-08-10T06:10:00+08:00'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-10T06:04:00+08:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('HoldCountdown', () => {
  it('menampilkan sisa waktu dalam mm:ss', () => {
    render(<HoldCountdown holdExpiresAt={holdExpiresAt} offsetMs={0} onExpired={() => undefined} />)

    expect(screen.getByText('06:00')).toBeDefined()
  })

  it('P1-75: memanggil onExpired sekali ketika hold habis', () => {
    const onExpired = vi.fn()
    render(<HoldCountdown holdExpiresAt={holdExpiresAt} offsetMs={0} onExpired={onExpired} />)

    vi.advanceTimersByTime(6 * 60_000 + 2_000)

    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(screen.getByText('00:00')).toBeDefined()
  })
})
```

- [ ] **Step 6: Tulis komponen**

Buat `apps/web/src/components/booking/HoldCountdown.tsx`:

```tsx
'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { formatRemaining, remainingMs } from './hold-countdown.ts'

interface HoldCountdownProps {
  holdExpiresAt: string
  offsetMs: number
  onExpired: () => void
}

export function HoldCountdown({
  holdExpiresAt,
  offsetMs,
  onExpired,
}: HoldCountdownProps): ReactNode {
  const [remaining, setRemaining] = useState(() => remainingMs(holdExpiresAt, Date.now(), offsetMs))
  const hasFired = useRef(false)

  useEffect(() => {
    const tick = (): void => {
      const next = remainingMs(holdExpiresAt, Date.now(), offsetMs)
      setRemaining(next)
      if (next === 0 && !hasFired.current) {
        hasFired.current = true
        onExpired()
      }
    }
    const timer = setInterval(tick, 1000)
    tick()
    return () => clearInterval(timer)
  }, [holdExpiresAt, offsetMs, onExpired])

  return (
    <span
      className="font-display text-3xl font-bold tabular-nums text-primary"
      aria-live="polite"
      aria-label="Sisa waktu mengunci slot"
    >
      {formatRemaining(remaining)}
    </span>
  )
}
```

- [ ] **Step 7: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/web exec vitest run src/components/booking/`
Expected: PASS (semua test booking)

- [ ] **Step 8: Tulis halaman booking**

Buat `apps/web/src/app/booking/[id]/page.tsx`:

```tsx
import type { ReactNode } from 'react'
import { BookingHoldPanel } from '../../../components/booking/BookingHoldPanel.tsx'
import { RequireSession } from '../../../components/common/RequireSession.tsx'
import { fetchPublicConfig } from '../../../lib/public-config.ts'

export const dynamic = 'force-dynamic'

interface BookingPageProps {
  params: Promise<{ id: string }>
}

export default async function BookingPage({ params }: BookingPageProps): Promise<ReactNode> {
  const { id } = await params
  const config = await fetchPublicConfig()

  return (
    <RequireSession>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BookingHoldPanel
          bookingId={id}
          serverTime={config.server_time}
          midtransClientKey={config.midtrans_client_key}
        />
      </main>
    </RequireSession>
  )
}
```

Buat `apps/web/src/components/booking/BookingHoldPanel.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatRupiah, formatTimeWita } from '../../lib/format.ts'
import { serverTimeOffsetMs } from '../../lib/server-time.ts'
import { Button } from '../ui/button.tsx'
import { HoldCountdown } from './HoldCountdown.tsx'
import { PayButton } from './PayButton.tsx'

interface BookingHoldPanelProps {
  bookingId: string
  serverTime: string
  midtransClientKey: string
}

export function BookingHoldPanel({
  bookingId,
  serverTime,
  midtransClientKey,
}: BookingHoldPanelProps): ReactNode {
  const [expired, setExpired] = useState(false)
  const [offsetMs] = useState(() => serverTimeOffsetMs(serverTime, Date.now()))
  const onExpired = useCallback(() => setExpired(true), [])

  const booking = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings[':id'].$get({ param: { id: bookingId } })
      if (!response.ok) throw new Error('Booking tidak dapat dimuat.')
      return response.json()
    },
  })

  if (booking.isPending) return <p className="text-muted-foreground">Memuat booking…</p>
  if (booking.isError || !booking.data) {
    return <p className="rounded-xl bg-destructive/10 p-4 text-destructive">Booking tidak ditemukan.</p>
  }

  const data = booking.data.data

  if (expired || (data.status === 'expired' && data.hold_expires_at === null)) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Waktu mengunci slot habis</h1>
        <p className="mt-3 text-muted-foreground">
          Slot dilepas kembali agar bisa dipesan orang lain. Silakan pilih slot lagi.
        </p>
        <Button asChild className="mt-6">
          <Link href="/lapangan">Pilih slot lagi</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-8">
      <h1 className="font-display text-3xl font-bold">Selesaikan pembayaran</h1>
      <p className="mt-2 text-muted-foreground">Kode booking {data.booking_code}</p>

      {data.hold_expires_at ? (
        <div className="mt-6 flex items-center gap-4 rounded-xl bg-secondary p-4">
          <HoldCountdown
            holdExpiresAt={data.hold_expires_at}
            offsetMs={offsetMs}
            onExpired={onExpired}
          />
          <p className="text-sm text-secondary-foreground">
            Slot dikunci sampai waktu ini habis. Selesaikan pembayaran sebelum itu.
          </p>
        </div>
      ) : null}

      <ul className="mt-6 grid gap-2">
        {data.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b pb-2">
            <span>{formatTimeWita(item.starts_at)}</span>
            <span className="font-semibold">{formatRupiah(item.line_total_amount)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-display font-bold">Total</span>
        <span className="font-display text-2xl font-bold text-primary">
          {formatRupiah(data.total_amount)}
        </span>
      </div>

      <PayButton bookingId={bookingId} midtransClientKey={midtransClientKey} />
    </div>
  )
}
```

`PayButton` dibuat di Task 15.

- [ ] **Step 9: Verifikasi**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/components/booking/ apps/web/src/app/booking/
git commit -m "feat(web): add booking hold countdown"
```

---

### Task 15: Pembayaran Snap & halaman status

**Files:**
- Create: `apps/web/src/components/booking/PayButton.tsx`
- Create: `apps/web/src/components/booking/PaymentStatus.tsx`
- Create: `apps/web/src/app/booking/[id]/status/page.tsx`
- Modify: `apps/web/src/lib/env.ts` (tidak ada perubahan kode; hanya diperiksa)

**Interfaces:**
- Consumes: `apiClient`, `env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` (Task 7), `MIDTRANS_ORIGIN`
- Produces: `PayButton` dengan prop `{ bookingId: string; midtransClientKey: string }`; `PaymentStatus` dengan prop `{ paymentId: string; bookingId: string }`

- [ ] **Step 1: Tulis tombol bayar**

Buat `apps/web/src/components/booking/PayButton.tsx`:

```tsx
'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { env } from '../../lib/env.ts'
import { MIDTRANS_ORIGIN } from '../../lib/security-headers.ts'
import { Button } from '../ui/button.tsx'

interface SnapCallbacks {
  onSuccess: () => void
  onPending: () => void
  onError: () => void
  onClose: () => void
}

interface SnapGlobal {
  pay: (token: string, callbacks: SnapCallbacks) => void
}

interface PayButtonProps {
  bookingId: string
  midtransClientKey: string
}

/** Origin dipilih dari variabel build yang sama dengan pembentuk CSP (§ 3.5 spek). */
const isProduction = env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
const snapOrigin = isProduction ? MIDTRANS_ORIGIN.production : MIDTRANS_ORIGIN.sandbox
const snapScriptUrl = `${snapOrigin}/snap/snap.js`

export function PayButton({ bookingId, midtransClientKey }: PayButtonProps): ReactNode {
  const router = useRouter()
  const [scriptFailed, setScriptFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPayment = useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.v1.payments.$post(
        { json: { booking_id: bookingId } },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      )
      if (!response.ok) throw new Error('Pembayaran tidak dapat dibuat.')
      return response.json()
    },
    onSuccess: (body) => {
      const payment = body.data
      const statusPath = `/booking/${bookingId}/status?payment=${payment.id}`
      const snap = (globalThis as { snap?: SnapGlobal }).snap

      // Cadangan: kalau snap.js gagal dimuat, alihkan ke halaman Snap penuh.
      if (scriptFailed || !snap || !payment.snap_token) {
        if (payment.snap_redirect_url) {
          globalThis.location.href = payment.snap_redirect_url
          return
        }
        setError('Halaman pembayaran tidak dapat dibuka. Coba lagi.')
        return
      }

      snap.pay(payment.snap_token, {
        onSuccess: () => router.push(statusPath),
        onPending: () => router.push(statusPath),
        onError: () => router.push(statusPath),
        onClose: () => router.push(statusPath),
      })
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  })

  return (
    <>
      <Script
        src={snapScriptUrl}
        data-client-key={midtransClientKey}
        strategy="lazyOnload"
        onError={() => setScriptFailed(true)}
      />
      {error ? (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>
      ) : null}
      <Button
        className="mt-6 w-full"
        size="lg"
        variant="accent"
        disabled={createPayment.isPending}
        onClick={() => createPayment.mutate()}
      >
        {createPayment.isPending ? 'Menyiapkan pembayaran…' : 'Bayar sekarang'}
      </Button>
    </>
  )
}
```

`createPaymentSchema` adalah `z.object({ booking_id: idSchema }).strict()`, jadi body di atas sudah tepat — skema `.strict()` akan menolak field tambahan apa pun.

- [ ] **Step 2: Tulis komponen status**

Buat `apps/web/src/components/booking/PaymentStatus.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { Button } from '../ui/button.tsx'

const POLL_INTERVAL_MS = 3_000
const POLL_LIMIT_MS = 5 * 60_000
const FINAL_STATUSES = new Set(['paid', 'failed', 'expired', 'cancelled', 'refunded'])

interface PaymentStatusProps {
  paymentId: string
  bookingId: string
}

export function PaymentStatus({ paymentId, bookingId }: PaymentStatusProps): ReactNode {
  const [pollingStoppedAt, setPollingStoppedAt] = useState<number | null>(null)

  const payment = useQuery({
    queryKey: ['payment', paymentId],
    refetchInterval: (query) => {
      const status = query.state.data?.data.status
      if (status && FINAL_STATUSES.has(status)) return false
      if (pollingStoppedAt !== null) return false
      return POLL_INTERVAL_MS
    },
    queryFn: async () => {
      const response = await apiClient.api.v1.payments[':id'].$get({ param: { id: paymentId } })
      if (!response.ok) throw new Error('Status pembayaran tidak dapat dibaca.')
      return response.json()
    },
  })

  // Berhenti setelah 5 menit; menunggu tanpa batas hanya membakar kuota dan baterai.
  useEffect(() => {
    const timer = setTimeout(() => setPollingStoppedAt(Date.now()), POLL_LIMIT_MS)
    return () => clearTimeout(timer)
  }, [])

  const status = payment.data?.data.status

  if (status === 'paid') {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h1 className="font-display text-3xl font-bold text-primary">Pembayaran berhasil</h1>
        <p className="mt-3 text-muted-foreground">Booking kamu sudah terkonfirmasi.</p>
        <Button asChild className="mt-6">
          <Link href={`/akun/booking/${bookingId}`}>Lihat detail & e-receipt</Link>
        </Button>
      </div>
    )
  }

  if (status && FINAL_STATUSES.has(status)) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Pembayaran tidak selesai</h1>
        <p className="mt-3 text-muted-foreground">
          Status terakhir: {status}. Slot mungkin sudah dilepas.
        </p>
        <Button asChild className="mt-6">
          <Link href="/lapangan">Pilih slot lagi</Link>
        </Button>
      </div>
    )
  }

  if (pollingStoppedAt !== null) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Belum ada konfirmasi</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Kalau kamu sudah membayar, konfirmasi bisa terlambat masuk. Periksa lagi, atau hubungi
          staff sambil menyebut kode booking kamu.
        </p>
        <Button className="mt-6" onClick={() => void payment.refetch()}>
          Periksa lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-8 text-center">
      <h1 className="font-display text-2xl font-bold">Menunggu pembayaran</h1>
      <p className="mt-3 text-muted-foreground">
        Halaman ini memperbarui sendiri setiap 3 detik. Jangan tutup dulu.
      </p>
    </div>
  )
}
```

Tombol "Periksa lagi" memanggil `refetch` pada `GET /payments/{id}`, **bukan** `POST /payments/{id}/sync` — endpoint itu dibatasi role `staff`/`admin` dan akan menolak customer dengan `403`. Penyelarasan manual adalah tugas staff lewat runbook P1-95.

- [ ] **Step 3: Tulis halaman status**

Buat `apps/web/src/app/booking/[id]/status/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { PaymentStatus } from '../../../../components/booking/PaymentStatus.tsx'
import { RequireSession } from '../../../../components/common/RequireSession.tsx'

export const dynamic = 'force-dynamic'

interface PaymentStatusPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ payment?: string }>
}

export default async function PaymentStatusPage({
  params,
  searchParams,
}: PaymentStatusPageProps): Promise<ReactNode> {
  const [{ id }, { payment }] = await Promise.all([params, searchParams])
  if (!payment) notFound()

  return (
    <RequireSession>
      <main className="mx-auto max-w-2xl px-4 py-16">
        <PaymentStatus paymentId={payment} bookingId={id} />
      </main>
    </RequireSession>
  )
}
```

- [ ] **Step 4: Tangani peringatan harga**

Di `CheckoutForm.tsx`, tambahkan penanganan `meta.warnings` pada `quote`. Setelah blok `{quote.data ? … : null}` di dalam `<aside>`, sisipkan:

`Quote` membawa `warnings: QuoteWarning[]` **di dalam `data`**, bukan di `meta` — periksa di sana.

```tsx
        {(quote.data?.data.warnings ?? []).some(
          (warning) =>
            warning.code === 'PROMO_QUOTA_EXHAUSTED' || warning.code === 'PRICE_CHANGED',
        ) ? (
          <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
            Harga berubah sejak kamu memilih slot. Periksa ringkasan di atas — angka itulah yang
            akan ditagihkan.
          </p>
        ) : null}
```

Karena `quote` selalu dihitung ulang setiap `promoCode` atau pilihan slot berubah, ringkasan yang tampil sudah merupakan angka terbaru; peringatan ini yang membuat perubahannya terlihat, bukan terjadi diam-diam (E-10, E-13).

- [ ] **Step 5: Verifikasi**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test && pnpm --filter @hola/web build`
Expected: PASS

- [ ] **Step 6: Uji CSP sungguhan**

```bash
pnpm --filter @hola/web build && pnpm --filter @hola/web start
```

Buka satu booking, klik "Bayar sekarang", dan **buka konsol browser**. Kalau muncul `Refused to load the script` atau `Refused to frame`, CSP dari Task 7 belum benar — periksa `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` sudah terisi saat build. Popup Snap harus terbuka tanpa pelanggaran CSP.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/booking/ apps/web/src/app/booking/
git commit -m "feat(web): add snap payment and status polling"
```

---

# Fase E — Akun & keadaan tepi

### Task 16: Penjaga sesi + daftar booking

**Files:**
- Create: `apps/web/src/components/common/RequireSession.tsx`
- Create: `apps/web/src/components/account/BookingList.tsx`
- Create: `apps/web/src/app/akun/booking/page.tsx`
- Test: `apps/web/src/components/common/RequireSession.test.tsx`

**Interfaces:**
- Consumes: `authStore` dari `src/lib/auth.ts` (menyediakan `subscribe`, `getSnapshot`, `getServerSnapshot`, `restoreSession`)
- Produces: `RequireSession` dengan prop `{ children: ReactNode }` — merender `children` hanya saat sesi siap dan token ada; kalau tidak, mengalihkan ke `/login?next=<path saat ini>`

- [ ] **Step 1: Tulis test yang gagal**

Buat `apps/web/src/components/common/RequireSession.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/checkout',
}))

const snapshot = { accessToken: null as string | null, isReady: false }

vi.mock('../../lib/auth.ts', () => ({
  authStore: {
    subscribe: () => () => undefined,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => ({ accessToken: null, isReady: false }),
    restoreSession: async () => snapshot.accessToken,
  },
}))

const { RequireSession } = await import('./RequireSession.tsx')

afterEach(() => {
  replace.mockClear()
})

describe('RequireSession', () => {
  it('menahan render sampai pemulihan sesi selesai', () => {
    snapshot.accessToken = null
    snapshot.isReady = false

    render(
      <RequireSession>
        <p>rahasia</p>
      </RequireSession>,
    )

    expect(screen.queryByText('rahasia')).toBeNull()
    expect(replace).not.toHaveBeenCalled()
  })

  it('mengalihkan ke login dengan tujuan kembali saat tidak ada sesi', async () => {
    snapshot.accessToken = null
    snapshot.isReady = true

    render(
      <RequireSession>
        <p>rahasia</p>
      </RequireSession>,
    )

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login?next=%2Fcheckout')
    })
    expect(screen.queryByText('rahasia')).toBeNull()
  })

  it('merender isi saat sesi tersedia', () => {
    snapshot.accessToken = 'token'
    snapshot.isReady = true

    render(
      <RequireSession>
        <p>rahasia</p>
      </RequireSession>,
    )

    expect(screen.getByText('rahasia')).toBeDefined()
    expect(replace).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Jalankan test dan pastikan gagal**

Run: `pnpm --filter @hola/web exec vitest run src/components/common/RequireSession.test.tsx`
Expected: FAIL — modul tidak ada

- [ ] **Step 3: Tulis penjaga**

Buat `apps/web/src/components/common/RequireSession.tsx`:

```tsx
'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useSyncExternalStore } from 'react'
import { authStore } from '../../lib/auth.ts'

interface RequireSessionProps {
  children: ReactNode
}

/**
 * Access token hanya hidup di memori (S-5), jadi middleware peladen tidak dapat
 * menilai sesi. Penjaga ini menunggu `restoreSession` selesai sebelum menyimpulkan
 * bahwa pengunjung belum masuk — tanpa itu, reload halaman akan memantulkan
 * pengguna yang sebenarnya sudah login.
 */
export function RequireSession({ children }: RequireSessionProps): ReactNode {
  const router = useRouter()
  const pathname = usePathname()
  const session = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot,
  )

  useEffect(() => {
    if (session.isReady && session.accessToken === null) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [session.isReady, session.accessToken, pathname, router])

  if (!session.isReady) {
    return <p className="mx-auto max-w-2xl px-4 py-16 text-muted-foreground">Memuat sesi…</p>
  }
  if (session.accessToken === null) return null
  return <>{children}</>
}
```

- [ ] **Step 4: Jalankan test dan pastikan lulus**

Run: `pnpm --filter @hola/web exec vitest run src/components/common/RequireSession.test.tsx`
Expected: PASS (3 test)

- [ ] **Step 5: Hormati `?next=` saat login berhasil**

Di `apps/web/src/components/auth/LoginForm.tsx`, ganti `router.replace('/')` menjadi:

```tsx
      const next = new URLSearchParams(globalThis.location.search).get('next')
      router.replace(next && next.startsWith('/') ? next : '/')
```

Pemeriksaan `startsWith('/')` mencegah pengalihan terbuka ke domain luar.

- [ ] **Step 6: Tulis daftar booking**

Buat `apps/web/src/components/account/BookingList.tsx`:

```tsx
'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatDateWita, formatRupiah } from '../../lib/format.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { Card, CardContent } from '../ui/card.tsx'

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Menunggu pembayaran',
  confirmed: 'Terkonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
  no_show: 'Tidak hadir',
}

export function BookingList(): ReactNode {
  const [upcoming, setUpcoming] = useState(true)

  const bookings = useInfiniteQuery({
    queryKey: ['my-bookings', upcoming],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      // `myBookingsQuerySchema` menerima `upcoming` sebagai string 'true'/'false'.
      const response = await apiClient.api.v1.me.bookings.$get({
        query: {
          upcoming: upcoming ? 'true' : 'false',
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      })
      if (!response.ok) throw new Error('Daftar booking tidak dapat dimuat.')
      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.meta.pagination?.next_cursor ?? undefined,
  })

  const rows = (bookings.data?.pages ?? []).flatMap((page) => page.data)

  return (
    <div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={upcoming ? 'default' : 'outline'}
          onClick={() => setUpcoming(true)}
        >
          Mendatang
        </Button>
        <Button
          size="sm"
          variant={upcoming ? 'outline' : 'default'}
          onClick={() => setUpcoming(false)}
        >
          Riwayat
        </Button>
      </div>

      {bookings.isPending ? <p className="mt-6 text-muted-foreground">Memuat…</p> : null}

      {!bookings.isPending && rows.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-card p-10 text-center">
          <p className="font-display text-xl font-bold">Belum ada booking di sini</p>
          <p className="mt-2 text-muted-foreground">
            Pesan lapangan dan booking kamu akan muncul di halaman ini.
          </p>
          <Button asChild className="mt-6">
            <Link href="/lapangan">Lihat lapangan</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {rows.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <p className="font-display text-lg font-bold">{booking.booking_code}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateWita(`${booking.booking_date}T00:00:00+08:00`)} · {booking.slot_count}{' '}
                  slot
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                  {STATUS_LABEL[booking.status] ?? booking.status}
                </Badge>
                <span className="font-semibold">{formatRupiah(booking.total_amount)}</span>
              </div>
              <div className="flex gap-2">
                {booking.status === 'pending_payment' && booking.hold_expires_at ? (
                  <Button asChild size="sm" variant="accent">
                    <Link href={`/booking/${booking.id}`}>Lanjutkan pembayaran</Link>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/akun/booking/${booking.id}`}>Detail</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bookings.hasNextPage ? (
        <Button
          className="mt-6"
          variant="outline"
          disabled={bookings.isFetchingNextPage}
          onClick={() => void bookings.fetchNextPage()}
        >
          {bookings.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </Button>
      ) : null}
    </div>
  )
}
```

Nama parameter mengikuti `myBookingsQuerySchema` (`upcoming`, plus `cursor`/`limit` dari `cursorPaginationQuery`) dan `meta.pagination.next_cursor` dari `buildCursorMeta` di `apps/api/src/lib/pagination.ts`. Keduanya sudah diverifikasi terhadap kode saat rencana ini ditulis.

- [ ] **Step 7: Tulis halaman**

Buat `apps/web/src/app/akun/booking/page.tsx`:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BookingList } from '../../../components/account/BookingList.tsx'
import { RequireSession } from '../../../components/common/RequireSession.tsx'

export const metadata: Metadata = { title: 'Booking saya' }

export default function MyBookingsPage(): ReactNode {
  return (
    <RequireSession>
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-foreground">Booking saya</h1>
        <div className="mt-8">
          <BookingList />
        </div>
      </main>
    </RequireSession>
  )
}
```

- [ ] **Step 8: Verifikasi**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/common/ apps/web/src/components/account/ \
  apps/web/src/app/akun/ apps/web/src/components/auth/LoginForm.tsx
git commit -m "feat(web): add session guard and booking history"
```

---

### Task 17: Detail booking, e-receipt, dan pembatalan

**Files:**
- Create: `apps/web/src/components/account/CancelDialog.tsx`
- Create: `apps/web/src/components/account/BookingDetail.tsx`
- Create: `apps/web/src/app/akun/booking/[id]/page.tsx`
- Create: `apps/web/src/app/akun/booking/[id]/receipt/page.tsx`

**Interfaces:**
- Consumes: `is_cancellable`, `refund_estimate_amount`, `policy_applied` dari Task 3; `cancellation_policy_text` dari `/config/public`
- Produces: `CancelDialog` dengan prop `{ bookingId: string; refundEstimateAmount: number; policyApplied: string; cancellationPolicyText: string | null; onCancelled: () => void }`

- [ ] **Step 1: Tulis dialog pembatalan**

Buat `apps/web/src/components/account/CancelDialog.tsx`:

```tsx
'use client'

import { useMutation } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatRupiah } from '../../lib/format.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog.tsx'

const POLICY_LABEL: Record<string, string> = {
  option_a_no_refund: 'Tanpa pengembalian dana',
  option_b_100_percent_minus_gateway_fee: 'Pengembalian penuh dikurangi biaya gateway',
  option_b_50_percent: 'Pengembalian 50%',
  option_b_no_refund_under_24h: 'Kurang dari 24 jam sebelum main — tanpa pengembalian',
  option_c_wallet_credit: 'Dikembalikan sebagai kredit',
  pending_payment_no_refund: 'Belum dibayar — tidak ada dana yang dikembalikan',
}

interface CancelDialogProps {
  bookingId: string
  refundEstimateAmount: number
  policyApplied: string
  cancellationPolicyText: string | null
  onCancelled: () => void
}

export function CancelDialog({
  bookingId,
  refundEstimateAmount,
  policyApplied,
  cancellationPolicyText,
  onCancelled,
}: CancelDialogProps): ReactNode {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const cancel = useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.v1.bookings[':id'].cancel.$post({
        param: { id: bookingId },
        json: { reason },
      })
      if (!response.ok) throw new Error('Pembatalan gagal. Coba lagi.')
      return response.json()
    },
    onSuccess: onCancelled,
    onError: (mutationError: Error) => setError(mutationError.message),
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Batalkan booking</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan booking ini?</DialogTitle>
          <DialogDescription>
            Baca perkiraan pengembalian dana di bawah sebelum melanjutkan.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-secondary p-4">
          <div className="flex justify-between">
            <span className="text-secondary-foreground">Perkiraan dikembalikan</span>
            <span className="font-display text-xl font-bold text-secondary-foreground">
              {formatRupiah(refundEstimateAmount)}
            </span>
          </div>
          <p className="mt-2 text-sm text-secondary-foreground">
            {POLICY_LABEL[policyApplied] ?? policyApplied}
          </p>
        </div>

        {cancellationPolicyText ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {cancellationPolicyText}
          </p>
        ) : null}

        <div className="grid gap-1.5">
          <Label htmlFor="cancel-reason">Alasan pembatalan</Label>
          <Input
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Wajib diisi"
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>
        ) : null}

        <Button
          variant="destructive"
          disabled={reason.trim().length === 0 || cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          {cancel.isPending ? 'Membatalkan…' : 'Ya, batalkan booking'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

Refund Rp 0 tetap ditampilkan bersama kebijakan yang berlaku, tidak disembunyikan (BR-B-63). Tombol konfirmasi tetap terkunci sampai `reason` diisi.

- [ ] **Step 2: Tulis detail booking**

Buat `apps/web/src/components/account/BookingDetail.tsx`:

```tsx
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { formatDateWita, formatRupiah, formatTimeWita } from '../../lib/format.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { CancelDialog } from './CancelDialog.tsx'

interface BookingDetailProps {
  bookingId: string
  cancellationPolicyText: string | null
}

export function BookingDetail({
  bookingId,
  cancellationPolicyText,
}: BookingDetailProps): ReactNode {
  const queryClient = useQueryClient()

  const booking = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings[':id'].$get({ param: { id: bookingId } })
      if (!response.ok) throw new Error('Booking tidak dapat dimuat.')
      return response.json()
    },
  })

  const onCancelled = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })
    void queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
  }, [queryClient, bookingId])

  if (booking.isPending) return <p className="text-muted-foreground">Memuat…</p>
  if (booking.isError || !booking.data) {
    return <p className="rounded-xl bg-destructive/10 p-4 text-destructive">Booking tidak ditemukan.</p>
  }

  const data = booking.data.data

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{data.booking_code}</h1>
          <p className="mt-1 text-muted-foreground">
            {formatDateWita(`${data.booking_date}T00:00:00+08:00`)}
          </p>
        </div>
        <Badge variant={data.status === 'confirmed' ? 'default' : 'secondary'}>{data.status}</Badge>
      </div>

      <ul className="mt-8 grid gap-2">
        {data.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b pb-2">
            <span>
              {formatTimeWita(item.starts_at)}–{formatTimeWita(item.ends_at)} · {item.rate_class}
            </span>
            <span className="font-semibold">{formatRupiah(item.line_total_amount)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-display font-bold">Total</span>
        <span className="font-display text-2xl font-bold text-primary">
          {formatRupiah(data.total_amount)}
        </span>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {data.status === 'pending_payment' && data.hold_expires_at ? (
          <Button asChild variant="accent">
            <Link href={`/booking/${data.id}`}>Lanjutkan pembayaran</Link>
          </Button>
        ) : null}
        {data.status === 'confirmed' || data.status === 'completed' ? (
          <Button asChild variant="outline">
            <Link href={`/akun/booking/${data.id}/receipt`}>Lihat e-receipt</Link>
          </Button>
        ) : null}
        {data.is_cancellable ? (
          <CancelDialog
            bookingId={data.id}
            refundEstimateAmount={data.refund_estimate_amount}
            policyApplied={data.policy_applied}
            cancellationPolicyText={cancellationPolicyText}
            onCancelled={onCancelled}
          />
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Tulis halaman detail**

Buat `apps/web/src/app/akun/booking/[id]/page.tsx`:

```tsx
import type { ReactNode } from 'react'
import { BookingDetail } from '../../../../components/account/BookingDetail.tsx'
import { RequireSession } from '../../../../components/common/RequireSession.tsx'
import { fetchPublicConfig } from '../../../../lib/public-config.ts'

export const dynamic = 'force-dynamic'

interface BookingDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function BookingDetailPage({
  params,
}: BookingDetailPageProps): Promise<ReactNode> {
  const [{ id }, config] = await Promise.all([params, fetchPublicConfig()])

  return (
    <RequireSession>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <BookingDetail bookingId={id} cancellationPolicyText={config.cancellation_policy_text} />
      </main>
    </RequireSession>
  )
}
```

- [ ] **Step 4: Tulis halaman e-receipt**

Buat `apps/web/src/app/akun/booking/[id]/receipt/page.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Receipt } from '../../../../../components/account/Receipt.tsx'
import { RequireSession } from '../../../../../components/common/RequireSession.tsx'

export const dynamic = 'force-dynamic'

interface ReceiptPageProps {
  params: Promise<{ id: string }>
}

export default async function ReceiptPage({ params }: ReceiptPageProps): Promise<ReactNode> {
  const { id } = await params

  return (
    <RequireSession>
      <main className="mx-auto max-w-2xl px-4 py-12 print:max-w-none print:py-0">
        <Receipt bookingId={id} />
      </main>
    </RequireSession>
  )
}
```

Buat `apps/web/src/components/account/Receipt.tsx`:

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '../../lib/api-client.ts'
import { Button } from '../ui/button.tsx'

interface ReceiptProps {
  bookingId: string
}

export function Receipt({ bookingId }: ReceiptProps): ReactNode {
  const receipt = useQuery({
    queryKey: ['receipt', bookingId],
    queryFn: async () => {
      const response = await apiClient.api.v1.bookings[':id'].receipt.$get({
        param: { id: bookingId },
      })
      if (!response.ok) throw new Error('E-receipt tidak dapat dimuat.')
      return response.json()
    },
  })

  if (receipt.isPending) return <p className="text-muted-foreground">Memuat e-receipt…</p>
  if (receipt.isError || !receipt.data) {
    return <p className="rounded-xl bg-destructive/10 p-4 text-destructive">E-receipt belum tersedia.</p>
  }

  const data = receipt.data.data

  return (
    <article className="rounded-xl border bg-card p-8 print:border-0 print:p-0">
      <header className="border-b pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Hola Sports Center
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold">Bukti pemesanan</h1>
        <p className="mt-1 text-muted-foreground">{data.booking_code}</p>
      </header>

      <dl className="mt-6 grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tanggal main</dt>
          <dd className="font-semibold">
            {formatDateWita(`${data.booking_date}T00:00:00+08:00`)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-semibold">{data.status}</dd>
        </div>
      </dl>

      <ul className="mt-6 grid gap-2">
        {data.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b pb-2 text-sm">
            <span>
              {formatTimeWita(item.starts_at)}–{formatTimeWita(item.ends_at)} · {item.rate_class}
            </span>
            <span className="font-semibold">{formatRupiah(item.line_total_amount)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-between border-t pt-4">
        <span className="font-display font-bold">Total dibayar</span>
        <span className="font-display text-xl font-bold text-primary">
          {formatRupiah(data.total_amount)}
        </span>
      </div>

      <Button className="mt-8 print:hidden" onClick={() => globalThis.print()}>
        Cetak
      </Button>
    </article>
  )
}
```

Tambahkan `import { formatDateWita, formatRupiah, formatTimeWita } from '../../lib/format.ts'`.

`GET /bookings/{id}/receipt` mengembalikan `{ booking_code, booking_date, status, quote, total_amount, items }` — sudah diverifikasi terhadap `bookings.routes.ts` saat rencana ini ditulis. Field `quote` tidak dirender di sini karena rinciannya sudah terwakili oleh `items` dan `total_amount`.

- [ ] **Step 5: Verifikasi**

Run: `pnpm --filter @hola/web typecheck && pnpm --filter @hola/web test && pnpm --filter @hola/web build`
Expected: PASS

- [ ] **Step 6: Uji alur pembatalan**

Buat booking berbayar di lingkungan lokal, buka detailnya, dan pastikan dialog menampilkan nominal pengembalian **sebelum** tombol konfirmasi dapat ditekan, serta tombol tetap mati sampai alasan diisi.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/account/ apps/web/src/app/akun/
git commit -m "feat(web): add booking detail, receipt, and cancellation"
```

---

### Task 18: Keadaan error, kosong, dan offline

**Files:**
- Create: `apps/web/src/app/not-found.tsx`
- Create: `apps/web/src/app/error.tsx`
- Create: `apps/web/src/app/(public)/lapangan/error.tsx`
- Create: `apps/web/src/app/offline/page.tsx`
- Create: `apps/web/src/components/common/EmptyState.tsx`
- Modify: `apps/web/src/app/providers.tsx`

**Interfaces:**
- Produces: `EmptyState` dengan prop `{ title: string; description: string; actionHref?: string; actionLabel?: string }`

- [ ] **Step 1: Tulis komponen keadaan kosong**

Buat `apps/web/src/components/common/EmptyState.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '../ui/button.tsx'

interface EmptyStateProps {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps): ReactNode {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <p className="font-display text-xl font-bold text-foreground">{title}</p>
      <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-6">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Tulis halaman 404**

Buat `apps/web/src/app/not-found.tsx`:

```tsx
import type { ReactNode } from 'react'
import { EmptyState } from '../components/common/EmptyState.tsx'

export default function NotFound(): ReactNode {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24">
      <EmptyState
        title="Halaman tidak ditemukan"
        description="Tautan yang kamu buka mungkin sudah berubah atau salah ketik."
        actionHref="/"
        actionLabel="Kembali ke beranda"
      />
    </main>
  )
}
```

- [ ] **Step 3: Tulis batas error**

Buat `apps/web/src/app/error.tsx`:

```tsx
'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Button } from '../components/ui/button.tsx'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps): ReactNode {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Ada yang tidak beres</h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        Kami sudah mencatat kejadiannya. Coba muat ulang halaman ini.
      </p>
      {error.digest ? (
        <p className="mt-2 text-sm text-muted-foreground">Kode kejadian: {error.digest}</p>
      ) : null}
      <Button className="mt-8" onClick={reset}>
        Coba lagi
      </Button>
    </main>
  )
}
```

`global-error.tsx` sudah ada di repo dan menangani kegagalan di layout root; berkas ini menangani kegagalan di dalam halaman. Keduanya diperlukan.

Buat `apps/web/src/app/(public)/lapangan/error.tsx` dengan isi yang sama persis, kecuali judul diganti menjadi `Daftar lapangan gagal dimuat` dan deskripsi menjadi `Ketersediaan lapangan sedang tidak dapat diambil. Coba lagi sebentar.` Salin seluruh berkasnya — jangan mengimpor dari `app/error.tsx`, karena Next memperlakukan tiap `error.tsx` sebagai batas terpisah.

- [ ] **Step 4: Tulis halaman offline**

Buat `apps/web/src/app/offline/page.tsx`:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { EmptyState } from '../../components/common/EmptyState.tsx'

export const metadata: Metadata = { title: 'Tidak ada koneksi' }

export default function OfflinePage(): ReactNode {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24">
      <EmptyState
        title="Tidak ada koneksi"
        description="Perangkat kamu sedang tidak terhubung ke internet. Booking yang sudah dibuat tetap aman."
        actionHref="/"
        actionLabel="Coba lagi"
      />
    </main>
  )
}
```

Ini halaman biasa, bukan cache offline — tidak ada service worker di Phase 1.

- [ ] **Step 5: Deteksi offline dan tangani 401 akhir**

Ganti isi `apps/web/src/app/providers.tsx`:

```tsx
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { authStore } from '../lib/auth.ts'
import { createQueryClient } from '../lib/query-client.ts'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(createQueryClient)
  const router = useRouter()

  useEffect(() => {
    // S-5: single-flight di store mencegah React Strict Mode memakai refresh cookie dua kali.
    void authStore.restoreSession()
  }, [])

  useEffect(() => {
    const goOffline = (): void => router.push('/offline')
    globalThis.addEventListener('offline', goOffline)
    return () => globalThis.removeEventListener('offline', goOffline)
  }, [router])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

Penanganan `401` sendiri sudah tuntas di `api-client` (refresh single-flight) dan `RequireSession`: ketika refresh gagal, `onUnauthorized` mengosongkan `authStore`, `RequireSession` melihat `accessToken === null` dan mengalihkan ke `/login?next=…`. Tidak ada penanganan `401` tambahan yang perlu ditulis di sini.

- [ ] **Step 6: Sorot booking pending saat datang dari konflik BR-B-14**

Di `apps/web/src/components/account/BookingList.tsx`, baca query param `pending` yang dikirim `CheckoutForm` (E-20) dan tampilkan pemberitahuan di atas daftar:

```tsx
  const searchParams = useSearchParams()
  const highlightPending = searchParams.get('pending') === '1'
```

lalu di dalam `return`, sebelum tombol tab:

```tsx
      {highlightPending ? (
        <p className="mb-6 rounded-xl bg-secondary p-4 text-secondary-foreground">
          Kamu sudah punya 3 booking yang belum dibayar. Selesaikan atau batalkan salah satunya
          sebelum memesan lagi.
        </p>
      ) : null}
```

Tambahkan `useSearchParams` ke import dari `next/navigation`, dan bungkus `<BookingList />` di halaman dengan `<Suspense fallback={null}>` karena `useSearchParams` memerlukannya saat prerender.

- [ ] **Step 7: Verifikasi menyeluruh**

```bash
pnpm lint
pnpm --filter @hola/web typecheck
pnpm --filter @hola/web test
pnpm --filter @hola/web build
pnpm --filter @hola/api typecheck
pnpm --filter @hola/api test
```

Expected: seluruhnya PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/ apps/web/src/components/
git commit -m "feat(web): add error, empty, and offline states"
```

---

## Verifikasi akhir P1.K

Setelah Task 18 selesai, jalankan pemeriksaan penutup ini sebelum menandai P1-71…P1-80 selesai di `tasks/PHASE-1.md`.

- [ ] **Test wajib BR-TT-16 ada dan hijau**

```bash
pnpm --filter @hola/web exec vitest run src/components/booking/AvailabilityGrid.test.tsx \
  src/components/booking/hold-countdown.test.ts \
  src/components/booking/checkout-validation.test.ts
```

Ketiganya adalah sasaran yang disebut P1-80: grid ketersediaan, countdown hold, dan validasi kondisional form checkout.

- [ ] **Tidak ada aritmetika harga di klien (BR-B-12)**

```bash
grep -rnE "(price|amount|total)[A-Za-z_]*\s*[*+/-]=|\*\s*(price|amount|total)" apps/web/src
```

Expected: tidak ada keluaran. Setiap kecocokan harus ditinjau — harga hanya boleh diformat, tidak dihitung.

- [ ] **Alur end-to-end di lingkungan lokal**

Dengan `pnpm dev:infra && pnpm dev` berjalan dan data seed terisi: buka landing → daftar lapangan → detail → pilih 2 slot → checkout → kunci slot → countdown berjalan → bayar dengan Snap sandbox → halaman status berubah jadi berhasil → e-receipt tampil → batalkan booking dan pastikan nominal pengembalian tampil sebelum konfirmasi.

- [ ] **Tandai task selesai**

Centang P1-71 sampai P1-80 di `tasks/PHASE-1.md`, dan catat di P1-100 bahwa `GET /sports` ditambahkan ke kontrak API selama implementasi.

---

## Catatan penyimpangan dari anggaran

P1.K dianggarkan 9 jam untuk `apps/web` saja. Rencana ini menambahkan Fase A (tiga task di `apps/api`, sekitar 1,5–2 jam) karena endpoint yang dibutuhkan P1-71, P1-72, dan P1-78 belum ada. Ambil waktunya dari buffer P1-101, dan catat di sana bahwa buffer terpakai untuk prasyarat API, bukan untuk bug.

