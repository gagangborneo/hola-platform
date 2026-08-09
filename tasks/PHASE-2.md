# PHASE-2 — Working Document: Phase 2 (Operasional)

> Ini **working document sesi coding**, bukan dokumen kontrak. Konteks phase, risiko, dan
> estimasi tingkat tinggi ada di [ROADMAP § 5](ROADMAP.md#5-phase-2--operasional). Business rule
> ada di dokumen modul — dokumen ini hanya **menunjuk** ke sana.
>
> **Goal Phase 2:** memindahkan pekerjaan back-office yang masih manual — tagihan tenant,
> pencatatan keuangan, data customer, dan penyelenggaraan event — ke dalam sistem.
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
| ⏳ | **Terblokir task Phase 1 yang belum selesai** — lihat [gerbang masuk](#gerbang-masuk-phase-2--yang-harus-selesai-dulu-di-phase-1) |
| *acuan* | File & bagian `docs/` yang menjadi sumber kebenaran task ini |

**Aturan kerja yang berlaku untuk setiap task:**

1. Selesai = `pnpm typecheck && pnpm lint && pnpm test` hijau ([00 § 8](../docs/00-OVERVIEW.md#8-definisi-selesai-untuk-v1)).
2. Setiap `BR-*` yang diimplementasikan punya test yang **menyebut nomornya di judul test**
   ([16 BR-TT-01](../docs/16-CONVENTIONS.md#82-aturan-test)).
3. Menemukan `[BUTUH KEPUTUSAN CLIENT]` → pakai default tertulis + komentar
   `// [D-xx] default sementara — lihat docs/00-OVERVIEW.md § 6` ([16 AI-10](../docs/16-CONVENTIONS.md#10-aturan-untuk-ai-coding-assistant)).
4. Menemukan kontradiksi antar-dokumen → **laporkan**, jangan pilih sendiri
   ([16 AI-11](../docs/16-CONVENTIONS.md#10-aturan-untuk-ai-coding-assistant)).
5. Menambah kolom / endpoint / job berarti memperbarui `docs/` di PR yang sama
   ([16 AI-7/AI-8/AI-9](../docs/16-CONVENTIONS.md#10-aturan-untuk-ai-coding-assistant)).

---

## Ringkasan beban

| Blok | Isi | Hari kerja |
|---|---|---|
| P2.A | Schema slice 3 — tenant + finance | 4,5 |
| P2.B | `finance/` inti — chart of accounts, `buildJournal()`, J-28, backfill | 6,5 |
| P2.C | J-29, ringkasan harian & laporan inti (R-1, R-2, R-7) | 4 |
| P2.D | `cafe/` — unit, tenant, kontrak | 4,5 |
| P2.E | Siklus tagihan bulanan — J-10…J-13 + prorata | 6 |
| P2.F | Pembayaran tenant & portal tenant | 4 |
| P2.G | Pengeluaran, penguncian periode, laporan sisa (R-3…R-6, R-8, R-9) | 6 |
| P2.H | `apps/admin` — tenant & keuangan | 6 |
| P2.I | `crm/` + `apps/admin` CRM | 4,5 |
| P2.J | ⚙️ Migration `slot_claims.event_id` + schema event | 2,5 |
| P2.K | `events/` — penjadwalan & lifecycle | 5,5 |
| P2.L | Registrasi, kuota, waitlist, event berbayar | 6,5 |
| P2.M | UI event — `apps/web` & `apps/admin` | 5 |
| P2.N | Utang teknis Phase 1 (U-1, U-2, U-3 + temuan P1.K/P1.L) | 5 |
| P2.O | Data produksi, monitoring, penutup Phase 2 | 4 |
| P2.P | Buffer (5%) | 4 |
| | **Total** | **78,5** |

**105 task, 16 blok.**

> ⚠️ **Kontradiksi yang dilaporkan, bukan diputuskan sendiri (aturan kerja no. 4).**
> [ROADMAP § 5.6](ROADMAP.md#56-estimasi-phase-2) menyebut **50–65 hari kerja**, tetapi rincian
> komponen di baris yang sama (tenant 14–18, finance 14–18, CRM 6–8, event 16–20, utang teknis
> Phase 1 4–6, buffer 5–7) berjumlah **59–77 hari** — total dan rinciannya tidak konsisten satu
> sama lain. Nominal bottom-up dokumen ini **78,5 hari** berada tepat di atas batas atas
> rinciannya dan jauh di atas angka totalnya.
>
> Sebagai pembanding: Phase 1 nominal 80,5 hari untuk cakupan yang sebanding
> ([ROADMAP § 4.6](ROADMAP.md#46-estimasi-phase-1)), padahal Phase 2 sudah mewarisi
> `slots.claim()`, pipeline harga, infrastruktur payment/webhook, dan komponen tabel admin
> yang teruji. Sebaran per area di dokumen ini: finance ≈ 22, tenant ≈ 19,5, event ≈ 19,5,
> CRM 4,5, utang teknis 5, penutup 4, buffer 4.
>
> **Keputusan yang dibutuhkan:** angka mana yang dipakai sebagai baseline — perbaiki
> ROADMAP § 5.6, atau potong scope Phase 2 memakai tuas di
> [ROADMAP § 9.4](ROADMAP.md#94-kalau-harus-lebih-cepat-tuas-yang-tersedia). Jangan mulai
> dengan dua angka yang berbeda di dua dokumen.

---

## Gerbang masuk Phase 2 — yang harus selesai dulu di Phase 1

Phase 1 sengaja belum diselesaikan. Bagian ini memetakan **task Phase 1 yang belum tercentang
mana** yang benar-benar memblokir blok Phase 2, dan mana yang tidak. Task ber-⏳ di bawah tidak
boleh dimulai sebelum prasyaratnya hijau.

| Task Phase 1 yang belum selesai | Memblokir | Alasan |
|---|---|---|
| **P1-23** — 10 aturan invalidasi cache I-1…I-10 🔒 | **P2.K** (penjadwalan event) | Klaim slot event mengubah ketersediaan. Tanpa I-1…I-10, lapangan yang sudah dikunci event tetap tampak kosong sampai TTL 60 detik habis — dan penjadwalan ulang event (BR-E-26) menyentuh dua tanggal sekaligus |
| **P1-37** — `POST /bookings/{id}/cancel` | **P2-70** (force schedule), **P2-72** (batal event), **P2.N** (reschedule) | DoD-2-08 mensyaratkan `force=true` membatalkan booking + refund 100%. Jalur pembatalannya adalah kode yang sama |
| **P1-30** — `POST /court-maintenances` | **P2-45** (laporan R-3 okupansi) | `available_slot_count` = grid − slot `maintenance`. Tanpa klaim maintenance, penyebutnya salah |
| **P1-14** — `GET /pricing/preview` | **P2-88** (UI penjadwalan event) | Sama seperti P1-84, layar admin butuh pratinjau harga; saat ini memakai `POST /bookings/quote` lewat `apps/admin/src/lib/quote.ts` |
| **P1-20, P1-25, P1-40, P1-57** — test 🔴 slots / availability / bookings / payment | **P2-84** (DoD-2-07), **P2-93** (DoD-2-10) | Test race kuota event memakai harness race yang sama (dijalankan dua kali: Redis hidup & Redis mati). Membangunnya dari nol di Phase 2 adalah pekerjaan ganda |
| **F0-56** — test auth & RBAC tabel-driven 🔴 | **P2-40** (DoD-2-03) | Phase 2 menambahkan role `tenant` dengan pembatasan paling ketat di seluruh sistem. Tabel RBAC-nya harus diperluas, bukan dibuat baru |
| **P1-35** — BR-B-14/B-15 + `expected_total_amount` | — | Tidak memblokir Phase 2 |
| **F0-81, F0-83, F0-84, F0-86, F0-87, F0-90, F0-92…F0-94, F0-97, F0-98** — deploy, backup drill, monitoring | **P2.O** saja | Pengembangan lokal Phase 2 jalan tanpa ini. Tetapi **RK-2-02 dan RK-2-08 mensyaratkan database restore yang berfungsi** (F0-90) sebelum backfill jurnal dan sebelum migration `slot_claims` dijalankan di produksi |
| **P1-92…P1-99** — go-live Phase 1 | **P2.O** | Phase 2 tidak bisa go-live sebelum Phase 1 go-live |

> **Yang tetap boleh dimulai sekarang:** P2.A, P2.B, P2.C, P2.D, P2.E, P2.F, P2.G, P2.H, P2.I,
> P2.J. Seluruh jalur tenant + finance + CRM tidak menyentuh slot, sehingga tidak terpengaruh
> Phase 1 yang belum tuntas — [09 § 7](../docs/09-MODULE-TENANT.md#7-integrasi-ke-modul-lain)
> menyebut modul tenant sebagai **satu-satunya modul bisnis yang tidak menyentuh `slot_claims`**.

---

# PHASE 2 — OPERASIONAL

## P2.A — Schema slice 3: tenant + finance · 4,5h

> Dikerjakan sekaligus karena jurnal tenant membutuhkan `accounts`
> ([ROADMAP § 5.3](ROADMAP.md#53-urutan-pengerjaan) langkah 1). Seluruh 53 enum sudah ada sejak
> F0-08/F0-23 — blok ini **tidak** menambah tipe enum, hanya tabel.

- [ ] **P2-01** `1h` 🔒 ⛔ K-15 — Tabel `accounts` (PK `code` text, FK `parent_code` → `accounts.code`, CHECK `code <> parent_code`, `type`, `is_active`) + seed **chart of accounts lengkap** dari [14 § 4](../docs/14-MODULE-FINANCE.md#4-chart-of-accounts-minimal) — `code` bersifat kanonik, **jangan diubah**. *acuan:* [03 § 16](../docs/03-DATA-MODEL.md#16-entitas-finance)
- [ ] **P2-02** `1h` 🔒 — Tabel `journal_entries` (**C-11** `total_debit_amount = total_credit_amount`, **C-13** UNIQUE `(source_type, source_id, kind)`, UNIQUE `entry_number`, `status`, `voided_by_entry_id`) + `journal_lines` (**C-12** `(debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)`). Sequence `seq_journal_entry` sudah dibuat di F0-29. *acuan:* [03 § 16](../docs/03-DATA-MODEL.md#16-entitas-finance)
- [ ] **P2-03** `0,5h` — Tabel `expenses` (`expense_date`, `account_code`, `vendor_name`, `description`, `amount`, `paid_with`, `receipt_media_id`, `recorded_by_user_id`) + `finance_daily_summaries` (PK `summary_date`). *acuan:* [14 § 6](../docs/14-MODULE-FINANCE.md#6-pengeluaran-expenses), [14 § 7](../docs/14-MODULE-FINANCE.md#7-laporan)
- [ ] **P2-04** `1h` 🔒 — Tabel `cafe_units` (UNIQUE `code`), `cafe_tenants` (UNIQUE partial `owner_user_id`), `cafe_contracts` (**C-10** UNIQUE partial `(cafe_unit_id) WHERE status='active'`, CHECK `start_date < end_date`, CHECK `due_day_of_month BETWEEN 1 AND 28`). *acuan:* [03 § 15](../docs/03-DATA-MODEL.md#15-entitas-cafe-tenant), [09 § 3.1](../docs/09-MODULE-TENANT.md#31-field-kunci)
- [ ] **P2-05** `0,5h` — Tabel `cafe_invoices` (**C-9** UNIQUE `(cafe_contract_id, period_year, period_month)`, CHECK `period_month BETWEEN 1 AND 12`, CHECK `paid_amount >= 0 AND paid_amount <= total_amount + late_fee_amount`, CHECK `issue_date <= due_date`) + `cafe_invoice_lines` + kolom `payments.cafe_invoice_id`. *acuan:* [03 § 15](../docs/03-DATA-MODEL.md#15-entitas-cafe-tenant)
- [ ] **P2-06** `0,5h` 🔴 — Test integrasi schema: **C-9, C-10, C-11, C-12 benar-benar ditegakkan database** (bukan hanya service) + `seq_invoice_number` menghasilkan format kode manusia yang benar. *acuan:* [03 § 2 Format kode manusia](../docs/03-DATA-MODEL.md#format-kode-manusia)

## P2.B — `finance/` inti: template jurnal & J-28 · 6,5h

- [ ] **P2-07** `0,5h` 🔒 — Modul `finance/`: `GET`/`POST`/`PATCH /accounts` + BR-F-20 (**akun induk ditolak** di `journal_lines`), BR-F-21 (tidak dihapus, hanya `is_active=false`), BR-F-22, BR-F-23 (`code`/`type` akun terpakai tidak dapat diubah). *acuan:* [14 § 4 Aturan chart of accounts](../docs/14-MODULE-FINANCE.md#aturan-chart-of-accounts), [04 § 9.14](../docs/04-API-CONTRACT.md#914-finance)
- [ ] **P2-08** `1,5h` 🔒 — `journal-builder.ts` **pure**: `buildJournal(financeEvent) -> { lines[] }` untuk **T-1** (booking gateway), **T-2** (booking tunai/transfer), **T-3** (settlement), **T-4** (event/turnamen, termasuk cabang diskon 100% dan cabang gratis tanpa jurnal). **Melempar sebelum menyentuh database bila Σdebit ≠ Σkredit** (BR-F-31); baris bernilai 0 tidak dibuat (BR-F-32); pendapatan **selalu bruto** (BR-F-35). *acuan:* [14 § 5](../docs/14-MODULE-FINANCE.md#5-sumber-transaksi-otomatis)
- [ ] **P2-09** `1h` 🔒 — `buildJournal()` lanjutan: **T-5** (`accrual` + `accrual_late_fee`), **T-6** (pembayaran tenant, sumber = baris `payments` bukan tagihan), **T-7**/**T-8** (deposit diterima/dikembalikan, termasuk pemotongan tunggakan), **T-9**/**T-10** (refund accrual & settlement), **T-11** (expense), **T-12** (write-off), **T-13** (reversal). `memo` dapat dibaca manusia (BR-F-33). *acuan:* [14 § 5](../docs/14-MODULE-FINANCE.md#5-sumber-transaksi-otomatis)
- [ ] **P2-10** `1h` 🔴 — Test `journal-builder`: **13 template masing-masing punya test** yang memverifikasi Σdebit = Σkredit **dan akun yang benar** (**DoD-2-04**, BR-F-30) — coverage wajib 100% seperti `pricing/`. *acuan:* [14 § 5 Aturan template](../docs/14-MODULE-FINANCE.md#aturan-template), [16 BR-TT-15](../docs/16-CONVENTIONS.md#82-aturan-test)
- [ ] **P2-11** `1h` 🔒 — J-28 `system.postJournalEntries` (repeat 5 m): `SELECT … WHERE status='pending' ORDER BY created_at LIMIT 500 **FOR UPDATE SKIP LOCKED**` → build → cek periode terkunci → `INSERT journal_entries + journal_lines ON CONFLICT DO NOTHING` → `finance_events.status='done'`. Gagal 5× → `failed` + alert Sentry (BR-F-08); E-1 (event sama dua kali) tetap `done`. *acuan:* [14 § 3.1](../docs/14-MODULE-FINANCE.md#31-alur), [02 § 5.2](../docs/02-INFRASTRUCTURE.md#52-tabel-job)
- [ ] **P2-12** `0,5h` — `entry_date` = **tanggal bisnis kejadian (WITA)**, bukan tanggal posting (BR-F-06, E-4) + `entry_number` `JE-{YYYYMM}-{seq5}` dari sequence **di dalam transaksi** (BR-F-05) + `finance_events` dengan `entry_date` di periode terkunci → `failed`, `last_error='period_locked'`, **tanpa pemindahan tanggal otomatis** (BR-F-07, E-5, RK-2-09)
- [ ] **P2-13** `1h` 🔴 ⏳ F0-90 — **Backfill jurnal Phase 1**: jalankan J-28 atas seluruh `finance_events` yang menumpuk `pending` sejak Phase 1 (ROADMAP A-2). **Dijalankan ke database restore lebih dulu**, hasilnya dibandingkan dengan `SUM(payments WHERE status='paid')`, baru ke produksi (RK-2-02). Catat hasil & selisih di `docs/runbooks/backfill-jurnal-log.md` (**DoD-2-09**)

## P2.C — J-29, ringkasan harian & laporan inti · 4h

> Urutan sengaja: verifikasi selisih nol atas data nyata Phase 1 **sebelum** menambah sumber
> jurnal baru ([ROADMAP § 5.3](ROADMAP.md#53-urutan-pengerjaan) langkah 3).

- [ ] **P2-14** `1h` — J-29 `system.buildDailySummary` (cron 01:30 WITA untuk H-1): **hitung ulang penuh + upsert** `finance_daily_summaries` sehingga jurnal yang terlambat masuk tetap tercermin (BR-F-50, E-2). *acuan:* [14 § 7 R-1](../docs/14-MODULE-FINANCE.md#7-laporan)
- [ ] **P2-15** `0,5h` 🔒 — **BR-F-51**: J-29 membandingkan `SUM(payments.amount WHERE status='paid' AND date(paid_at)=D)` dengan total kredit `4-1xxx` dikurangi debit `4-9xxx` pada `entry_date=D`. **Selisih ≠ 0 memicu alert** — ini deteksi dini jurnal yang gagal (E-11). *acuan:* [07 BR-P-46](../docs/07-MODULE-PAYMENT.md#62-aturan-rekonsiliasi)
- [ ] **P2-16** `0,5h` — R-1 `GET /admin/reports/daily-summary` + label UI **"Surplus Kas Operasional"**, bukan "Laba" (BR-F-52 — ini bukan laba akuntansi)
- [ ] **P2-17** `1h` — R-2 `GET /admin/reports/revenue`: `group_by ∈ {day, week, month, source}`, sumber `journal_lines` akun `4-1xxx` (kredit) & `4-9xxx` (debit), menyajikan bruto per sumber, diskon, refund, neto, jumlah & nilai rata-rata transaksi + **batas rentang 366 hari** → `422` (E-23). *acuan:* [14 § 7 R-2](../docs/14-MODULE-FINANCE.md#7-laporan), [04 § 11](../docs/04-API-CONTRACT.md#11-edge-cases-api)
- [ ] **P2-18** `0,5h` — R-7 `GET /admin/reports/cash-position`: 3 saldo kas + piutang + utang refund + deposit; **peringatan BR-F-55** bila saldo `1-1300` > Rp 10 juta **atau** ada payment `paid` > 7 hari tanpa jurnal `settlement` (E-8, RK-2-10); deposit tenant sebagai **pengurang** posisi kas bersih (BR-F-56)
- [ ] **P2-19** `0,5h` 🔴 — **DoD-2-05**: J-29 melaporkan **selisih nol 7 hari berturut-turut** atas data nyata Phase 1. Jangan menambah sumber jurnal baru sebelum butir ini hijau

## P2.D — `cafe/`: unit, tenant, kontrak · 4,5h

- [ ] **P2-20** `0,5h` — `GET`/`POST`/`PATCH /cafe-units` + `cafe_units.status` (`available` / `occupied`). *acuan:* [04 § 9.11](../docs/04-API-CONTRACT.md#911-cafe-tenant), [05 § 6.10](../docs/05-AUTH.md#610-cafe-tenant)
- [ ] **P2-21** `0,5h` — `GET`/`POST`/`GET {id}`/`PATCH /cafe-tenants` + **BR-T-14** (satu `cafe_tenants` ↔ maksimal satu `users` berrole `tenant`) + penautan/pelepasan `owner_user_id`; tenant tanpa akun tetap dapat dikelola admin. Suspensi tetap **manual** (BR-T-60)
- [ ] **P2-22** `1h` 🔒 — `POST`/`PATCH /cafe-contracts` (+ `If-Match`), `contract_number` `HC-{YYYY}-{seq3}` — **butuh sequence baru `seq_contract_number`** (lihat catatan kesenjangan dokumen di bawah blok ini), **BR-T-06** (`rent_amount`, `service_charge_amount`, `due_day_of_month`, `start_date` terkunci setelah ada tagihan non-`draft` → `409`), **BR-T-07** (`end_date` **boleh** diperpanjang — pengecualian sadar). Kenaikan sewa = kontrak baru, bukan edit (E-13). *acuan:* [09 § 3.2](../docs/09-MODULE-TENANT.md#32-business-rules-kontrak)
- [ ] **P2-23** `1h` 🔒 — `POST /cafe-contracts/{id}/activate`: syarat **BR-T-04** (`signed_at`, `document_media_id`, `rent_amount > 0`, unit belum terisi → `409 CAFE_UNIT_OCCUPIED`), efek **BR-T-05** (`cafe_units → occupied`, `cafe_tenants → active`) **dan langsung menerbitkan tagihan prorata bulan berjalan di dalam transaksi yang sama** (E-4 — kalau ditunggu J-10 bulan depan, bulan pertama tidak pernah tertagih)
- [ ] **P2-24** `0,5h` — `POST /cafe-contracts/{id}/terminate` (**BR-T-11**: `reason` wajib, `terminated_at`, unit → `available`, **tagihan bulan berjalan tetap terbit prorata**) + `audit_logs action='cafe_contract.terminate'` (BR-T-12) + state machine kontrak lengkap. *acuan:* [09 § 3.3](../docs/09-MODULE-TENANT.md#33-state-machine-kontrak)
- [ ] **P2-25** `0,5h` 🔴 — **Field-level filtering BR-T-13**: `rent_amount`, `service_charge_amount`, `deposit_amount` hanya terlihat `admin` dan `tenant` pemilik — **bukan `staff`**. Difilter di serializer (pola `◐` dari F0-53), bukan di UI, dengan test yang memverifikasinya (E-21). *acuan:* [05 § 7 Field-level filtering](../docs/05-AUTH.md#7-otorisasi-berbasis-kepemilikan)
- [ ] **P2-26** `0,5h` — J-13 `commerce.flagExpiringContracts` (cron Senin 03:00): `active → expiring` bila `end_date <= today + 60` (BR-T-08 — **tetap menghasilkan tagihan**, BR-T-09), `→ ended` + unit `available` bila `end_date < today` (BR-T-10), alert kontrak `draft` > 90 hari (E-20), **dan perannya sebagai sweeper resmi J-10**: setiap kontrak `active` wajib punya tagihan bulan berjalan, kalau tidak → alert (E-3, RK-2-04)

> ⚠️ **Kesenjangan dokumen yang dilaporkan, bukan diputuskan sendiri (aturan kerja no. 4).**
> [09 § 3.1](../docs/09-MODULE-TENANT.md#31-field-kunci) mendefinisikan `contract_number`
> berformat `HC-{YYYY}-{seq3}`, tetapi kode itu **tidak terdaftar** di tabel kanonik
> [03 § 2 Format kode manusia](../docs/03-DATA-MODEL.md#format-kode-manusia) dan **tidak ada
> sequence-nya** — F0-29 hanya membuat enam sequence (`seq_booking_code`, `seq_payment_code`,
> `seq_refund_code`, `seq_invoice_number`, `seq_journal_entry`, `seq_employee_number`).
>
> Konsekuensi konkret: P2-22 tidak dapat dikerjakan tanpa menambah sequence `seq_contract_number`
> lewat migration baru, dan tabel di 03 § 2 harus diperbarui di PR yang sama (aturan kerja no. 5).
> Pertanyaan yang perlu dijawab lebih dulu: apakah `seq3` di-reset per tahun (seperti
> `seq_invoice_number` yang bulanan) atau berjalan terus.

## P2.E — Siklus tagihan bulanan · 6h

- [ ] **P2-27** `1h` 🔒 — `prorate.ts` **pure**: `computeProrata(amount, activeDays, daysInMonth)` = `roundTo100(amount × hari_aktif / hari_dalam_bulan)` memakai **jumlah hari kalender aktual** (28/29/30/31), bukan 30 tetap (BR-T-40, BR-T-41); berlaku pada `rent_amount` **dan** `service_charge_amount` dengan proporsi sama (BR-T-43); deposit **tidak** diprorata (BR-T-45); deskripsi baris eksplisit `"Sewa 12–31 Jul 2026 (20/31 hari)"` (BR-T-44). Test **3 kasus DoD-2-02**. *acuan:* [09 § 4.4](../docs/09-MODULE-TENANT.md#44-prorata)
- [ ] **P2-28** `1h` 🔒 — `generateInvoiceForContract(tx, contract, period)` — **satu fungsi generator yang dipakai bersama** J-10 dan aktivasi kontrak (E-4): susun `cafe_invoice_lines` (sewa, service charge, penyesuaian bulan lalu), `INSERT cafe_invoices ... ON CONFLICT DO NOTHING`, `total_amount` per BR-T-24, `finance_events` `kind='accrual'`. **Tidak** memakai pipeline harga & promo (BR-T-25, BR-PR-14). *acuan:* [09 § 4.1](../docs/09-MODULE-TENANT.md#41-job-j-10-commercegeneratemonthlyinvoices)
- [ ] **P2-29** `1h` 🔒 — J-10 `commerce.generateMonthlyInvoices` (cron `0 1 1 * *`, 01:00 WITA): ambil kontrak `active`/`expiring` yang beririsan dengan periode, **setiap kontrak diproses dalam transaksinya sendiri** — bukan satu transaksi besar (E-2, RK-2-03, BR-BQ-15) — ringkasan ke admin (jumlah, nilai, yang dilewati) + `POST /admin/cafe/generate-invoices {period_year, period_month}` memakai **handler yang sama** (E-3)
- [ ] **P2-30** `0,5h` — Transisi `draft → issued`: otomatis bila `app_settings.cafe_invoice_auto_issue` (default **true**) atau manual `POST /cafe-invoices/{id}/issue` (BR-T-22); `draft` **belum** terlihat tenant dan belum masuk piutang (BR-T-21); `issued` menghasilkan `finance_events` `kind='accrual'` (BR-T-30)
- [ ] **P2-31** `0,5h` — `POST /cafe-invoices` (tagihan manual di luar cron), `PATCH /cafe-invoices/{id}` (**hanya** `adjustment_amount`, `other_amount`, `notes`; hanya `draft`/`issued`, BR-T-26; `adjustment_amount` boleh negatif), `POST /{id}/void` dengan `reason` — **hanya bila `paid_amount = 0`** (BR-T-27, BR-T-28). Tagihan tidak pernah dihapus (BR-T-29)
- [ ] **P2-32** `1h` — J-11 `commerce.markOverdueInvoices` (cron 02:00): `due_date + grace_period_days` dibaca **dari kontrak**, bukan nilai global (BR-T-51); denda `roundTo100(total × late_fee_percent / 100) + late_fee_flat_amount` (BR-T-52) **ditambahkan tepat satu kali** — idempoten lewat syarat `late_fee_amount = 0 AND status <> 'overdue'` (BR-T-53, E-14); menghasilkan baris `cafe_invoice_lines` akun `4-1900` + `finance_events` `kind='accrual_late_fee'` (BR-T-54, E-18). *acuan:* [09 § 5.2](../docs/09-MODULE-TENANT.md#52-business-rules-penagihan)
- [ ] **P2-33** `0,5h` ⛔ D-04 — J-12 `commerce.sendInvoiceReminder` (cron 08:00): offset **H-3, H-0, H+1, H+7, H+14** (BR-T-55); dedupe `notifications.dedupe_key = 'invoice:{invoiceId}:{offsetLabel}'` (BR-T-56, C-19); eskalasi ke **admin** pada H+14 (BR-T-57); email `cafe_tenants.email` + push ke `owner_user_id`, WhatsApp hanya bila D-04 aktif (BR-T-58); **tidak** dikirim untuk `void`/`paid` (BR-T-59)
- [ ] **P2-34** `0,5h` 🔴 — Test siklus tagihan: **DoD-2-01** (J-10 dijalankan dua kali → tidak ada tagihan ganda, C-9), **DoD-2-02** (3 kasus prorata: mulai tengah bulan, berakhir tengah bulan, Februari), E-1, E-5, E-7 (`due_day_of_month = 28` di Februari), E-14

## P2.F — Pembayaran tenant & portal tenant · 4h

- [ ] **P2-35** `1h` 🔒 — `POST /cafe-invoices/{id}/payments` (`Idempotency-Key` **wajib**): `SELECT … FOR UPDATE` pada baris tagihan, memakai tabel `payments` dengan `cafe_invoice_id`, `provider='manual'`, `method ∈ {cash, manual_transfer}` (BR-T-70); **pembayaran parsial diizinkan — satu-satunya payable yang boleh** (BR-T-71, BR-P-22); `paid_amount` dihitung ulang & disimpan dalam transaksi yang sama (BR-T-72); status otomatis `partially_paid`/`paid` (BR-T-74); `finance_events` `kind='payment'` (BR-T-75); `audit_logs` (BR-T-77). *acuan:* [09 § 5.3](../docs/09-MODULE-TENANT.md#53-pencatatan-pembayaran)
- [ ] **P2-36** `0,5h` — Penolakan yang wajib: kelebihan bayar → `422 CAFE_PAYMENT_EXCEEDS_INVOICE` dengan arahan `adjustment_amount` negatif bulan berikutnya (BR-T-73, E-8); tagihan `void` → `409 CAFE_INVOICE_VOID` (E-9); dua staff mencatat bersamaan → diserialkan row lock, yang kedua ditolak (E-10). Tenant **tidak** dapat mencatat pembayaran sendiri (BR-T-78)
- [ ] **P2-37** `0,5h` ⛔ K-09 — Template notifikasi tenant: `cafe_invoice.issued`, `cafe_invoice.reminder`, `cafe_invoice.overdue`, `cafe_invoice.paid`, `cafe_invoice.escalation`, `cafe_contract.expiring` — semuanya **juga menulis baris `inapp`**; identitas badan usaha (K-09) dipakai di kop tagihan. *acuan:* [02 § 7](../docs/02-INFRASTRUCTURE.md#7-notifikasi)
- [ ] **P2-38** `1h` 🔒 — Portal tenant (API): `GET /me/cafe-invoices`, `GET /cafe-invoices/{id}` milik sendiri, `GET /cafe-contracts?cafe_tenant_id={own}`. **Semua difilter dari `cafe_tenants.owner_user_id` di context, bukan dari parameter request** (BR-T-80, O-4); tagihan `draft` difilter **di query** (BR-T-83); akun yang belum ditautkan → `403 FORBIDDEN` di semua endpoint tenant (BR-T-82, E-19). *acuan:* [09 § 6](../docs/09-MODULE-TENANT.md#6-portal-tenant)
- [ ] **P2-39** `0,5h` — `POST /cafe-invoices/{id}/payment-proof` (`kind='payment_proof'`, bucket `hola-private`) — **tidak mengubah status tagihan**, hanya melampirkan bukti (BR-T-76, E-22) + dokumen kontrak diakses lewat presigned GET **TTL 15 menit**, tanpa URL permanen (BR-T-84). *acuan:* [02 § 6](../docs/02-INFRASTRUCTURE.md#6-object-storage)
- [ ] **P2-40** `0,5h` 🔴 ⏳ F0-56 — Test RBAC tenant tabel-driven: **DoD-2-03** — tenant dapat login, melihat tagihannya, dan mengunggah bukti bayar, **tanpa** bisa melihat data booking, customer, karyawan, laporan keuangan Hola, atau tagihan tenant lain (BR-T-81). *acuan:* [05 § 6.10](../docs/05-AUTH.md#610-cafe-tenant)

## P2.G — Pengeluaran, penguncian periode, laporan sisa · 6h

- [ ] **P2-41** `1h` ⛔ K-17 — `GET`/`POST`/`PATCH /expenses` + BR-F-40…F-46: `account_code` harus bertipe `expense`; **`staff` dibatasi `app_settings.staff_expense_limit_amount`** (default Rp 500.000) dan **hanya melihat pengeluaran yang ia catat sendiri** (BR-F-42, BR-F-43 → `403` dengan pesan yang menyebut batasnya); `receipt_media_id` wajib > Rp 100.000 (BR-F-44); `expense_date` maksimal 90 hari ke belakang (BR-F-46); menghasilkan `finance_events` `kind='expense'` (BR-F-41). **`5-1400` biaya gateway tidak boleh dicatat manual** (BR-F-48). *acuan:* [14 § 6](../docs/14-MODULE-FINANCE.md#6-pengeluaran-expenses), [05 § 6.13](../docs/05-AUTH.md#613-finance)
- [ ] **P2-42** `0,5h` — Peringatan duplikat pengeluaran: `vendor_name` + `amount` + `expense_date` sama dalam 7 hari terakhir → **peringatan, bukan penolakan** (E-17 — dua pengeluaran identik bisa sah)
- [ ] **P2-43** `1h` — Jurnal manual: `POST /journal-entries` dibuat `draft` dan harus di-`post` eksplisit (BR-F-04), `POST /{id}/post`, `POST /{id}/void` yang membuat **entri pembalik** `kind='reversal'` lalu menandai entri lama `voided` + `voided_by_entry_id`, wajib `reason` + `audit_logs` (BR-F-09, T-13). Void hanya untuk `posted` (E-15). Validasi: `422 JOURNAL_NOT_BALANCED` (E-12), akun induk ditolak (E-13), akun nonaktif → `422 ACCOUNT_INACTIVE` (E-14). Jurnal `voided` tidak ikut laporan, `reversal` ikut (BR-F-10)
- [ ] **P2-44** `0,5h` ⛔ K-16 — Penguncian periode: `app_settings.finance_locked_until_date` mengunci semua `entry_date` ≤ tanggal itu → `409 JOURNAL_PERIOD_LOCKED` (BR-F-60); hanya `admin`, mengunci **dan** membuka mencatat `audit_logs` (BR-F-61); **pemeriksaan pra-kunci** BR-F-62 (ada `finance_events` `pending`/`failed` di periode itu? selisih R-1 nol untuk semua tanggal?) — mengunci dengan pemeriksaan gagal diizinkan tetapi butuh konfirmasi eksplisit. *acuan:* [14 § 7 Penutupan periode](../docs/14-MODULE-FINANCE.md#penutupan-periode)
- [ ] **P2-45** `1h` ⏳ P1-30 — R-3 `GET /admin/reports/occupancy` (`available_slot_count` dari `court_operating_hours` **dikurangi slot `maintenance`**, `claimed_slot_count` dari `slot_claims` `confirmed` bertipe `booking`/`event`/`match`, `occupancy_rate`, **`effective_occupancy_rate` yang mengecualikan `no_show`**, pecahan per court/`rate_class`/hari/jam) + R-4 `GET /admin/reports/discounts` (per promo: pemakaian, total diskon, kuota, nilai transaksi, **rasio diskon terhadap pendapatan bruto**)
- [ ] **P2-46** `0,5h` — R-5 `GET /admin/reports/tenant-ar`: 5 kelompok umur dari `due_date`, per tenant dan total, **peringatan bila total ≠ saldo akun `1-2100`** + R-8 `GET /journal-entries?account_code=` buku besar dengan saldo berjalan (E-17 tenant menunggak 3 bulan)
- [ ] **P2-47** `0,5h` — R-6 `GET /admin/reports/profit-loss` + **catatan kaki wajib** BR-F-53 ("tidak memuat penyusutan aset, akrual beban, dan pajak — bukan laporan keuangan untuk pelaporan resmi") dan BR-F-54 (basis pencatatan campuran: booking kas, tenant akrual). Tanpa catatan itu angkanya bisa disalahartikan (E-22)
- [ ] **P2-48** `0,5h` — R-9 `POST /admin/reports/{report}/export`: `202` → CSV di bucket `hola-private` + presigned link **TTL 15 menit** dikirim lewat notifikasi in-app saat siap, semua ekspor mencatat `audit_logs`
- [ ] **P2-49** `0,5h` — J-33 `system.pruneAuditLogs` (cron bulanan 05:00, `audit_logs` > 24 bulan) + pembersihan `finance_events` berstatus `done` > 180 hari. **`journal_entries` & `journal_lines` tidak pernah dibersihkan** (BR-F-11)

## P2.H — `apps/admin`: tenant & keuangan · 6h

> Memakai komponen tabel data generik F0-75 (offset pagination, filter, sort, `q`, keadaan
> kosong/error) — jangan membuat tabel kedua.

- [ ] **P2-50** `1h` ⛔ K-14 — Modul tenant: daftar unit / tenant / kontrak, form kontrak, aksi aktivasi & terminasi (dengan `reason`), unggah dokumen kontrak lewat presigned (`kind='contract_document'`), tampilan saldo deposit per kontrak (BR-T-93)
- [ ] **P2-51** `1h` — Daftar & detail tagihan: filter status/periode/tenant, rincian `cafe_invoice_lines`, riwayat pembayaran, tombol `issue` / `void` / `generate-invoices` untuk periode tertentu + tampilan **prorata yang dapat diverifikasi tenant** (BR-T-44)
- [ ] **P2-52** `0,5h` — Form pencatatan pembayaran tenant (parsial diizinkan) dengan `Idempotency-Key` dari client + unggah bukti + penanganan `422 CAFE_PAYMENT_EXCEEDS_INVOICE` yang menjelaskan jalur `adjustment_amount` negatif
- [ ] **P2-53** `1h` 🔒 — **Portal tenant** (role `tenant` di `apps/admin`): navigasi terbatas 5 halaman ([09 § 6](../docs/09-MODULE-TENANT.md#6-portal-tenant)) — ringkasan, kontrak saya, tagihan saya, detail tagihan, unggah bukti bayar. Guard rute per role hanya UX; **keamanan tetap di API** ([05 § 1](../docs/05-AUTH.md#1-prinsip))
- [ ] **P2-54** `1h` — Modul keuangan: daftar jurnal + detail (header + `journal_lines`), form jurnal manual dengan validasi balance **di client dan server**, aksi void yang lebih dulu **menampilkan daftar jurnal terkait dengan `source_id` sama** sebelum konfirmasi (E-16)
- [ ] **P2-55** `0,5h` — Halaman pengeluaran: form + unggah struk + peringatan duplikat (E-17) + tampilan berbeda untuk `staff` (hanya miliknya, batas nominal terlihat sebelum submit)
- [ ] **P2-56** `1h` — Halaman laporan R-1…R-8 + tombol ekspor CSV + layar penguncian periode yang menampilkan **hasil pemeriksaan pra-kunci** BR-F-62 sebelum tombol kunci aktif

## P2.I — `crm/` · 4,5h

- [ ] **P2-57** `0,5h` — Tabel `customer_tags` (`code` UNIQUE, `name`, `color`, `is_active`), `customer_tag_assignments` (PK `(customer_user_id, tag_code)`), `customer_notes`. *acuan:* [03 § 14](../docs/03-DATA-MODEL.md#14-entitas-crm--hris)
- [ ] **P2-58** `1h` — `GET /customers` (filter `tier_code`, `tag`, `created_at_from/to`, `q` atas nama/email/telepon) + `GET /customers/{user_id}` **profil 360°** dengan seluruh field **dihitung on-demand**, tanpa denormalisasi. Field yang sumbernya Phase 3/4 (`lifetime_points`, `badges_count`, `tournaments_count`) dikembalikan sebagai nilai netral, bukan disembunyikan. *acuan:* [13 § 2](../docs/13-MODULE-CRM-HRIS.md#2-crm-scope-minimal), [04 § 9.12](../docs/04-API-CONTRACT.md#912-crm)
- [ ] **P2-59** `0,5h` — `PATCH /customers/{user_id}`: **BR-C-22** daftar field yang boleh diubah staff (`full_name`, `phone`, `email`, `birth_date`, `gender`, `skill_level`, `preferred_sport_id`, `internal_notes`) dan yang **tidak** (`tier_code`, `lifetime_points`, `referral_code`, `role`, `status`); **BR-C-23** mengubah email/phone menghapus `email_verified_at`/`phone_verified_at` + `audit_logs`
- [ ] **P2-60** `0,5h` — `GET /customers/{id}/bookings`, `GET /customers/{id}/payments`, `GET`/`POST /customers/{id}/notes` — catatan bersifat **append-only** (BR-C-10), tidak pernah terlihat customer (BR-C-11), `staff` & `admin` boleh menulis (BR-C-12), peringatan data sensitif di form (BR-C-13), `internal_notes` untuk ringkasan vs `customer_notes` untuk kronologi (BR-C-14)
- [ ] **P2-61** `0,5h` — `GET`/`POST /customer-tags` + `PUT /customers/{user_id}/tags` yang **mengganti seluruh set**, bukan menambah satu-satu (BR-C-02); membuat jenis tag dan menugaskannya hanya `admin`, bukan `staff` (BR-C-05); tag tidak mempengaruhi logika bisnis (BR-C-04)
- [ ] **P2-62** `0,5h` — **BR-C-21** konversi guest → customer: `PATCH /customers/{user_id}` dengan `link_guest_phone` yang menautkan booking historis — **operasi manual, tercatat `audit_logs`, tidak pernah otomatis** (nomor HP bisa berpindah pemilik) + **BR-C-25** `POST /admin/reports/customers/export` CSV ke bucket privat, hanya `admin`
- [ ] **P2-63** `1h` — `apps/admin` CRM: daftar customer + profil 360° + pengelolaan tag + kronologi catatan + **peringatan `high_no_show` di layar booking staff**. Di Phase 2 peringatan dihitung dari `no_show_count_90d >= 3` secara on-demand; **penugasan tag otomatis lewat J-24 menyusul Phase 3** (BR-C-03) — catat sebagai utang teknis U-8

## P2.J — ⚙️ Migration `slot_claims.event_id` + schema event · 2,5h

> Prasyarat modul event ([ROADMAP § 5.3](ROADMAP.md#53-urutan-pengerjaan) langkah 7). Dijalankan
> di jendela sepi dan **diuji lebih dulu di database restore** (RK-2-08).

- [ ] **P2-64** `0,5h` 🔒 — Tabel `events` + 3 CHECK: `ck_events_paid_fee` (`is_paid = false OR fee_amount > 0`), `ck_events_time_range` (`starts_at < ends_at`), `ck_events_registration_window` (`registration_opens_at < registration_closes_at <= starts_at`) + `slug` UNIQUE + kolom `slot_claim_count`, `published_at`, `cancelled_at`, `cancellation_reason`. *acuan:* [03 § 11](../docs/03-DATA-MODEL.md#11-entitas-event), [10 § 2](../docs/10-MODULE-EVENT.md#2-jenis-event--field)
- [ ] **P2-65** `0,5h` 🔒 — Tabel `event_registrations` + **C-14** UNIQUE partial `(event_id, user_id) WHERE user_id IS NOT NULL AND status <> 'cancelled'` + **C-15** UNIQUE partial `(event_id, waitlist_position) WHERE status='waitlisted'` + `ck_event_registrations_participant` + kolom `payments.event_registration_id`
- [ ] **P2-66** `1h` ⚙️🔒🔴 ⏳ F0-90 — **Migration `slot_claims.event_id`**: tambah kolom + FK, lalu ganti `ck_slot_claims_single_owner` dan `ck_slot_claims_owner_matches_type` dengan pola **`DROP` → `ADD … NOT VALID` → `VALIDATE CONSTRAINT`** agar tabel produksi tidak terkunci. **`uq_slot_claims_active` (C-1) tidak disentuh** — ia dibuat sekali di P1-01 dan tidak pernah berubah. *acuan:* [ROADMAP § 1.2](ROADMAP.md#12-evolusi-constraint-slot_claims-lintas-phase), [03 § 8.4](../docs/03-DATA-MODEL.md#84-constraint-inti-mekanisme)
- [ ] **P2-67** `0,5h` 🔴 — Test migration: klaim `event` dengan dua owner ditolak; klaim `booking` yang sudah ada tetap valid setelah `VALIDATE`; `uq_slot_claims_active` masih menolak dua klaim aktif pada slot yang sama

## P2.K — `events/`: penjadwalan & lifecycle · 5,5h

- [ ] **P2-68** `0,5h` — `POST /events` (status `draft`, tidak terlihat publik — BR-E-01), `PATCH /events/{id}` dengan `If-Match`; `slug` terkunci setelah `published` (BR-E-03); `capacity` **boleh dinaikkan** kapan saja tetapi **tidak boleh diturunkan** di bawah jumlah `confirmed` (BR-E-04, BR-E-05, E-7); `is_paid`/`fee_amount` terkunci setelah ada registrasi non-`cancelled` → `409 EVENT_HAS_REGISTRATIONS` (BR-E-06). Event tidak pernah dihapus (BR-E-14)
- [ ] **P2-69** `1,5h` 🔒 ⏳ P1-23 — `POST /events/{id}/schedule`: ekspansi rentang `starts_at..ends_at` menjadi daftar slot **pada grid masing-masing court** — court dengan `slot_duration_minutes` berbeda bisa membuat rentang yang sama tidak rata → `422 SLOT_NOT_ALIGNED` dengan `details` menunjuk court mana (BR-E-23); memanggil **`slots.claim({ claimType: 'event', mode: 'direct' })` yang sama dengan booking** — tanpa tabel `event_courts`, tanpa kolom "blocked", tanpa pengecekan overlap khusus (BR-E-20, BR-E-21); penjadwalan ulang melepas klaim lama **dan** membuat klaim baru dalam **satu transaksi** — klaim baru gagal berarti klaim lama tetap utuh (BR-E-26); `slot_claim_count` dihitung ulang (BR-E-27); invalidasi cache setelah commit. *acuan:* [10 § 4](../docs/10-MODULE-EVENT.md#4-relasi-ke-slot-lapangan)
- [ ] **P2-70** `0,5h` ⏳ P1-37 — Bentrok penjadwalan: `409 SLOT_ALREADY_CLAIMED` dengan `details` `{court_id, starts_at, claim_type}` (BR-E-24); **`force=true` hanya `admin` dan hanya menimpa `claim_type='booking'`** — bentrok dengan `event`/`match`/`maintenance` tidak dapat di-force (BR-E-25, E-9); force membatalkan booking + **refund 100%** + notifikasi (**DoD-2-08**, E-8). *acuan:* [03 § 8.8](../docs/03-DATA-MODEL.md#88-force-release-hanya-admin)
- [ ] **P2-71** `0,5h` — `POST /events/{id}/publish` (syarat **BR-E-02**: minimal satu `slot_claims` bertipe `event` sudah ada → `422 EVENT_SCHEDULE_REQUIRED`, `poster_media_id` terisi, `capacity >= 1`, jendela pendaftaran valid) + `/open-registration` + `/close-registration`; setiap transisi mencatat `audit_logs action='event.<transisi>'` (BR-E-15). **Event boleh mengunci lapangan sejak `draft`** — ini disengaja (BR-E-22)
- [ ] **P2-72** `1h` — `POST /events/{id}/cancel` (**BR-E-11**, `reason` wajib): satu transaksi — `status='cancelled'`, semua `slot_claims` event → `released` (`release_reason='event_cancelled'`), semua registrasi aktif → `cancelled`. **Setelah commit**: refund **100% tanpa potongan apa pun termasuk biaya gateway**, otomatis `approved` karena pembatalan berasal dari pihak Hola (BR-E-12, BR-P-53, BR-P-54) + notifikasi ke **seluruh peserta termasuk waitlist** (E-11)
- [ ] **P2-73** `0,5h` — J-14 `commerce.closeEventRegistration` (delayed pada `registration_closes_at`, `jobId = evtclose-{eventId}` — tanpa `:` sesuai batasan BullMQ v5) + J-16 `commerce.finalizeEvent` (delayed pada `ends_at + 2 jam`, `jobId = evtfinal-{eventId}`)
- [ ] **P2-74** `0,5h` — J-35 `commerce.sweepEventStates` (repeat 10 m) sebagai **sweeper resmi J-14 dan J-16**: ketiga transisi berbasis waktu dicari dari **kondisi di PostgreSQL**, bukan dari daftar job Redis; semua `UPDATE … WHERE status = <status asal>` sehingga aman diulang (BR-E-08, BR-E-09, E-21) + alert untuk event `draft` berumur > 60 hari atau yang slotnya sudah lewat (E-10, RK-2-07) + `min_participants` tidak tercapai → **peringatan ke admin, bukan pembatalan otomatis** (BR-E-10). *acuan:* [02 § 5.3](../docs/02-INFRASTRUCTURE.md#53-ketahanan-job-terhadap-kehilangan-redis)
- [ ] **P2-75** `0,5h` — `GET /events` (publik hanya `published`/`registration_open`/`registration_closed`/`ongoing`; admin melihat semua; filter `type`, `sport_id`, `status`, `starts_at_from/to`, `is_paid`) + `GET /events/{event_id_or_slug}` dengan kuota terisi & `is_registration_open`

## P2.L — Registrasi, kuota, waitlist, event berbayar · 6,5h

- [ ] **P2-76** `1,5h` 🔒 — `POST /events/{id}/registrations` (`Idempotency-Key` **wajib**): **`SELECT … FROM events WHERE id=? FOR UPDATE` di dalam transaksi** — pengecekan kuota di aplikasi tanpa lock **dilarang** (BR-E-37, BR-E-38); `taken = COUNT(status IN ('pending_payment','confirmed'))` (BR-E-30, BR-E-31); hanya diterima saat `registration_open` → `409 EVENT_REGISTRATION_NOT_OPEN` (BR-E-32); cabang penuh: waitlist mati → `409 EVENT_FULL` (BR-E-35), waitlist penuh → `409 EVENT_WAITLIST_FULL` (BR-E-36). `waitlist_capacity`: `0` = mati, `NULL` = tak terbatas — **jangan tukar artinya**. *acuan:* [10 § 5.3](../docs/10-MODULE-EVENT.md#53-alur-pendaftaran--waitlist)
- [ ] **P2-77** `0,5h` — Duplikasi pendaftaran: C-14 untuk user terdaftar (E-14), pemeriksaan aplikasi atas `guest_phone` yang sama untuk guest — bukan constraint, karena nomor HP bisa dibagi satu keluarga sehingga admin dapat menimpanya (BR-E-33, E-16) → `409 EVENT_ALREADY_REGISTERED`; `Idempotency-Key` sama memutar ulang response tersimpan (E-13); batal lalu daftar lagi diizinkan dan masuk waitlist belakang (E-15)
- [ ] **P2-78** `0,5h` — Waitlist FIFO: `waitlist_position = MAX(position) + 1` **di dalam transaksi ber-lock** dimulai dari 1 (BR-E-40), C-15 menjamin tidak ada dua peserta di posisi sama (BR-E-41), posisi peserta yang dipromosikan diset `NULL` dan **sisanya tidak dikompaksi** — tidak ada operasi geser yang bisa balapan (BR-E-45, RK-2-06); peserta boleh keluar sendiri (BR-E-48)
- [ ] **P2-79** `1h` 🔒 — J-15 `commerce.promoteEventWaitlist`: transaksi dengan `SELECT … FOR UPDATE` pada baris `events`, hitung kursi tersedia, ambil kandidat urut **`tier_priority DESC, waitlist_position ASC`** (BR-E-50 — satu-satunya benefit tier yang mempengaruhi logika bisnis di v1; sampai J-24 hidup di Phase 3 semua `tier_code` masih setara); **event gratis → langsung `confirmed`, event berbayar → `pending_payment` dengan tenggat 60 menit** dari `app_settings.event_waitlist_payment_window_minutes`, bukan 10 menit seperti slot (BR-E-43, BR-E-44) + notifikasi `event.waitlist_promoted` memuat tenggatnya (BR-E-47)
- [ ] **P2-80** `0,5h` — Pemicu J-15: registrasi `confirmed`/`pending_payment` dibatalkan, `capacity` dinaikkan (E-6), registrasi `pending_payment` kedaluwarsa (BR-E-42); peserta promosi yang tidak membayar → `cancelled` dengan `cancellation_reason='waitlist_payment_expired'` dan **tidak kembali ke waitlist**, J-15 lanjut ke berikutnya (BR-E-46, E-4) + `POST /event-registrations/{id}/promote` manual admin yang mencatat `audit_logs` karena melewati FIFO (BR-E-49)
- [ ] **P2-81** `0,5h` — Event berbayar: **pipeline harga yang sama** cabang `kind='event_registration'`, satu baris `type='fee'` (BR-E-60); **tidak** memakai `price_rules` (BR-E-61); promo hanya bila `allow_promo=true` dan `applies_to ∈ {event, all}` — default `false`, harus keputusan sadar (BR-E-62); `payments.event_registration_id`, alur webhook/idempotency/rekonsiliasi **identik** dengan booking (BR-E-63); tenggat `payment_due_at` 15 menit untuk registrasi biasa (BR-E-64); event gratis tetap membuat payment Rp 0 `provider='manual'` `status='paid'` (BR-E-66, BR-P-18) tetapi **tidak dijurnal** (E-7)
- [ ] **P2-82** `0,5h` ⛔ D-01 — `POST /event-registrations/{id}/cancel` oleh peserta: kebijakan refund **sama dengan booking**, dihitung terhadap `events.starts_at` (BR-E-68 — sengaja satu kebijakan agar mudah dipahami customer & staff); event dijadwalkan ulang → notifikasi `event.rescheduled` dan refund **100%** `policy_applied='hola_fault_100pct'` (E-12); registrasi `pending_payment` kedaluwarsa disapu J-35 (BR-E-65, E-3); pembayaran masuk setelah tenggat memakai jalur pemulihan yang sama dengan booking E-6 (E-24)
- [ ] **P2-83** `0,5h` — `POST /event-registrations/{id}/check-in` oleh `staff`/`admin` → `attended` + `attended_at`, jendela **60 menit sebelum `starts_at` s.d. `ends_at + 2 jam`** (BR-E-70, BR-E-71); J-16 mengubah `confirmed` yang tidak check-in menjadi `no_show` lalu event → `completed` (BR-E-72, E-17); pembatalan check-in hanya `admin` + `audit_logs` (BR-E-78). **Poin & baris `activities` (BR-E-73…BR-E-77) sengaja ditunda ke Phase 3** bersama gamification (ROADMAP A-3) — catat sebagai utang teknis U-9
- [ ] **P2-84** `1h` 🔴 ⏳ P1-20 — Test event: **DoD-2-07** — 20 pendaftaran serentak untuk event berkapasitas 10 menghasilkan **tepat 10** `confirmed`/`pending_payment` dan sisanya `waitlisted` posisi 1..10 tanpa duplikasi (E-1, C-15) — **dijalankan dua kali: Redis hidup dan Redis dimatikan** (E-20: kuota dijaga row lock PostgreSQL, bukan Redis) + E-2, E-3, E-4, E-5, E-15. *acuan:* [10 § 9](../docs/10-MODULE-EVENT.md#9-edge-cases)

## P2.M — UI event: `apps/web` & `apps/admin` · 5h

- [ ] **P2-85** `1h` — `apps/web`: daftar event publik (filter jenis & olahraga) + halaman detail per `slug` — poster, jadwal, lokasi, kuota terisi, sisa kursi, status pendaftaran + metadata SEO & OG image per event, masuk `sitemap.xml`
- [ ] **P2-86** `1h` — `apps/web`: alur pendaftaran tiga cabang — gratis (langsung `confirmed`), berbayar (Snap, memakai komponen pembayaran & polling Phase 1 dari P1-76), waitlist (menampilkan posisi ke-N) + **countdown tenggat 60 menit** untuk promosi waitlist dengan offset `server_time` yang sama seperti countdown hold (E-23 Phase 1)
- [ ] **P2-87** `0,5h` — `apps/web`: `/akun/event` riwayat pendaftaran (mendatang & lampau) + pembatalan sendiri yang **menampilkan estimasi refund + `policy_applied` sebelum konfirmasi**, konsisten dengan alur pembatalan booking P1-78
- [ ] **P2-88** `1h` ⏳ P1-14 — `apps/admin`: CRUD event + unggah poster (`kind='event_poster'`, kompresi di client) + layar penjadwalan (pilih court + rentang waktu) dengan penanganan `409 SLOT_ALREADY_CLAIMED` yang menampilkan **daftar bentrok beserta jenis klaimnya** dan menawarkan force **hanya** bila seluruh bentrok bertipe `booking`
- [ ] **P2-89** `1h` — `apps/admin`: kelola peserta — daftar per status (`confirmed`, `pending_payment`, `waitlisted`, `attended`, `no_show`), promosi manual, check-in, tambah peserta manual, dan **peringatan `min_participants` belum tercapai** saat pendaftaran ditutup
- [ ] **P2-90** `0,5h` — Verifikasi kalender slot P1-82 kini menampilkan klaim `event` **tanpa perubahan UI** (janji desain Phase 1) — perbaiki label/warna bila perlu, jangan menambah query khusus event

## P2.N — Utang teknis Phase 1 · 5h

> Sumber: [PHASE-1 § Utang teknis yang sengaja dibawa keluar Phase 1](PHASE-1.md#utang-teknis-yang-sengaja-dibawa-keluar-phase-1)
> dan dua blok `<details>` temuan P1.K/P1.L.

- [ ] **P2-91** `1,5h` 🔒 ⏳ P1-37 — **U-1 Reschedule booking** `POST /bookings/{id}/reschedule`: hanya `confirmed` (BR-B-50); customer **satu kali** dan minimal **24 jam** sebelum `starts_at` dari `app_settings.reschedule_min_hours_before`/`reschedule_max_count` (BR-B-51), `staff`/`admin` tanpa batas (BR-B-52); slot baru melewati validasi BR-B-01…B-09 (BR-B-53); **pelepasan lama dan klaim baru dalam satu transaksi — klaim baru gagal berarti klaim lama tetap utuh** (BR-B-54); **tolak slot yang lebih mahal** `422` (BR-B-55); `quote_snapshot` **tidak** dihitung ulang, perpindahan dicatat di `reschedule_history` (BR-B-56). *acuan:* [06 § 6](../docs/06-MODULE-BOOKING.md#6-reschedule)
- [ ] **P2-92** `0,5h` — Reschedule: `audit_logs action='booking.reschedule'` (BR-B-57), **membatalkan J-03/J-04 lama (remove `jobId`) lalu menjadwalkan yang baru** (BR-B-58), notifikasi ke customer, tidak mempengaruhi poin (BR-B-59)
- [ ] **P2-93** `0,5h` 🔴 ⏳ P1-40 — Test reschedule: **DoD-2-10** seluruh BR-B-50…B-59, termasuk skenario klaim baru gagal `409` → booking tetap memegang slot lamanya
- [ ] **P2-94** `1h` ⛔ K-05 — **U-2 `createRefund()` gateway**: implementasi di `MidtransProvider` + cabang `channel='gateway'` di J-08 `payment.processRefund`, `refund_key` gateway memakai `refunds.id` (BR-P-56), rute berdasarkan `capabilities` dari `app_settings.refund_api_supported_methods` — metode yang tidak didukung tetap jatuh ke `manual_transfer`; gagal → `refunds.status='failed'` yang dapat di-retry admin kembali ke `approved` (BR-P-55); refund gagal setelah T-9 dibuat tidak membuat T-10, dan bila akhirnya `rejected` maka T-9 di-void (E-10 Finance). *acuan:* [07 § 7.2](../docs/07-MODULE-PAYMENT.md#72-dukungan-refund-per-metode-pembayaran), [07 § 7.3](../docs/07-MODULE-PAYMENT.md#73-aturan-refund)
- [ ] **P2-95** `0,5h` — **U-3 `GET /availability` lintas court**: **tidak** di-cache sebagai satu kesatuan — ia menggabungkan hasil per court sehingga tetap memanfaatkan cache per court (BR-B-46) + batas rentang 14 hari & `meta.warnings` yang sama dengan endpoint per court (BR-B-47, E-19). *acuan:* [04 § 9.3](../docs/04-API-CONTRACT.md#93-katalog-lapangan--ketersediaan-publik)
- [ ] **P2-96** `0,5h` 🔴 — **Perbaikan kanal `walk_in`** (temuan P1.L, menghambat go-live): putuskan dan terapkan salah satu — `walk_in` ikut membuat pembayaran `cash` yang lunas, **atau** `cancelBooking` menerima booking `confirmed` tanpa pembayaran. Saat ini `POST /payments/manual` menolak `409 BOOKING_ALREADY_PAID` dan `POST /bookings/{id}/cancel` menjawab **`500`** untuk kondisi yang oleh `buildCancellationPreview` dilaporkan `is_cancellable: true` — dua endpoint saling bertentangan di [bookings.service.ts](../apps/api/src/modules/bookings/bookings.service.ts). Bersihkan juga booking uji `HB-260809-0012` dari database dev
- [ ] **P2-97** `0,5h` — Utang teknis P1.K/P1.L lain yang menghambat atau berdampak keamanan: `PASSWORD_PEPPER` di `packages/db/src/seed.ts` berbeda dari `apps/api/.env` sehingga akun seed tidak bisa login; `GET /bookings/{id}` mengembalikan `internal_note` & `guest_phone` ke customer pemilik; `GET /courts?status=inactive` dapat dienumerasi publik tanpa auth atau rate limit; `z.config({ jitless: true })` di `packages/shared/src/env/index.ts` **tidak boleh hilang** (CSP produksi tanpa `unsafe-eval`)

## P2.O — Data produksi, monitoring & penutup Phase 2 · 4h

- [ ] **P2-98** `0,5h` ⚙️ ⛔ K-15 — **Persetujuan akuntan atas chart of accounts** + saldo awal per akun dimasukkan sebagai jurnal manual pembuka. Salah akun di awal berarti seluruh jurnal otomatis salah, dan memperbaikinya = void massal
- [ ] **P2-99** `1h` ⚙️ ⛔ K-14, D-10 — Isi data produksi tenant: unit + luas, tenant existing, kontrak berjalan (nominal sewa & service charge, `due_day_of_month` 1–28, `grace_period_days`, kebijakan denda), dokumen kontrak, dan **besaran deposit** beserta opsi penyelesaian akhir kontrak (D-10, default Opsi A). *acuan:* [09 § 8](../docs/09-MODULE-TENANT.md#8-deposit-butuh-keputusan-client)
- [ ] **P2-100** `0,5h` ⛔ K-13 — Alert Phase 2 ke kanal yang sama dengan Phase 1: **selisih R-1 ≠ 0**, `finance_events` berstatus `failed`, tagihan bulan berjalan yang tidak terbit (sweeper J-13), saldo `1-1300` melewati ambang BR-F-55 — masing-masing **diuji, bukan diasumsikan**
- [ ] **P2-101** `0,5h` — Runbook `docs/runbooks/operasional-bulanan.md`: siklus tagihan tenant dari terbit sampai lunas, mencatat pembayaran parsial, memaafkan denda (E-16 Tenant), menutup periode keuangan, dan **apa yang dilakukan saat selisih R-1 tidak nol** (jawabannya: R-8 + `GET /journal-entries?source_type=`)
- [ ] **P2-102** `0,5h` — Sesi pelatihan admin untuk modul keuangan & tenant — siklusnya **bulanan**, berbeda ritmenya dari runbook operasional harian Phase 1, sehingga butuh sesi terpisah
- [ ] **P2-103** `0,5h` 🔴 — Verifikasi **10 butir DoD Phase 2** + kumpulkan bukti. *acuan:* [ROADMAP § 5.1](ROADMAP.md#51-definition-of-done-phase-2)
- [ ] **P2-104** `0,5h` — Pemutakhiran `docs/` untuk aturan yang berubah selama implementasi + catat utang teknis Phase 2 yang dibawa ke Phase 3/4 (lihat tabel di bawah)

## P2.P — Buffer · 4h

- [ ] **P2-105** `4h` — Buffer Phase 2 (5% dari total): bug tak terduga, selisih backfill jurnal, penyesuaian setelah persetujuan akuntan, migration yang perlu diulang. **Kalau buffer habis sebelum blok P2.K selesai, pilih tuas kompresi dari [ROADMAP § 9.4](ROADMAP.md#94-kalau-harus-lebih-cepat-tuas-yang-tersedia) sekarang** — jangan menunggu minggu terakhir

---

## Checklist gerbang — jangan lewati

### Sebelum P2-01

- [ ] Pertanyaan client Phase 2 sudah dikirim: **D-10, K-14, K-15, K-16, K-17** (dan D-04 bila
      pengingat tagihan lewat WhatsApp diinginkan)
- [ ] **K-15 sudah dijawab** — chart of accounts disetujui akuntan. Ini keputusan yang
      [ROADMAP § 8.3](ROADMAP.md#83-cara-memakai-bagian-ini) melarang dijawab "nanti saja"
- [ ] Task Phase 1 di [tabel gerbang masuk](#gerbang-masuk-phase-2--yang-harus-selesai-dulu-di-phase-1)
      sudah dipetakan: mana yang dikejar sekarang, mana yang sengaja dibiarkan

### Sebelum P2-13 (backfill jurnal)

- [ ] **F0-90 hijau** — drill restore sungguhan pernah dijalankan dan tercatat di
      `docs/runbooks/restore-drill-log.md`. Backfill ke database restore mustahil tanpa itu
- [ ] Hasil backfill di database restore dibandingkan dengan `SUM(payments WHERE status='paid')`
      **sebelum** menyentuh produksi (RK-2-02)

### Sebelum P2-66 (migration `slot_claims.event_id`)

- [ ] Migration diuji lebih dulu di database restore (RK-2-08)
- [ ] Dijalankan di jendela sepi, dengan pola `NOT VALID` + `VALIDATE` — bukan `ALTER` langsung
- [ ] `uq_slot_claims_active` **tidak** ikut disentuh

### Sebelum P2.K (modul event)

- [ ] **P1-23** (invalidasi cache I-1…I-10) hijau — tanpa ini slot yang dikunci event tetap
      tampak kosong sampai TTL habis
- [ ] **P1-37** (`POST /bookings/{id}/cancel`) hijau — DoD-2-08 memakai jalur pembatalan yang sama

### Sebelum menutup Phase 2

- [ ] 10 butir DoD Phase 2 tercentang, dengan bukti
- [ ] **DoD-2-05** terpenuhi: selisih R-1 nol **7 hari berturut-turut di produksi**
- [ ] Coverage 100% pada `journal-builder.ts`, `prorate.ts`, dan seluruh `*-policy.ts`/`*-state.ts`
      baru, ditegakkan CI
- [ ] Test race kuota event (DoD-2-07) dijalankan **dengan Redis mati** dan hijau
- [ ] Alert Phase 2 masuk ke kanal yang benar-benar dibaca (diuji, bukan diasumsikan)
- [ ] Admin sudah dilatih untuk siklus bulanan dan runbook ada di tangan mereka

---

## Utang teknis yang sengaja dibawa keluar Phase 2

| # | Utang | Ke | Alasan |
|---|---|---|---|
| U-8 | Tag otomatis `high_no_show` lewat J-24 (BR-C-03) | Phase 3 | J-24 adalah job rekalkulasi tier gamification. Phase 2 menghitung `no_show_count_90d` on-demand dan menampilkan peringatannya |
| U-9 | Poin kehadiran event & baris `activities` (BR-E-73…BR-E-77) | Phase 3 | Konsekuensi [ROADMAP A-3](ROADMAP.md#11-penyesuaian-terhadap-struktur-phase-wajib-dibaca) — `point_events` tidak ditulis sebelum Phase 3 agar leaderboard periode pertama tidak diguyur poin retroaktif |
| U-10 | `slot_claims.match_id` + CHECK final 4 kolom owner | Phase 4 | Migration bertahap yang sama seperti P2-66 ([ROADMAP § 1.2](ROADMAP.md#12-evolusi-constraint-slot_claims-lintas-phase)) |
| U-11 | HRIS: `employees`, `shifts`, absensi, izin/cuti | Phase 4 | [13 § 5–7](../docs/13-MODULE-CRM-HRIS.md#5-hris-scope-minimal); tidak ada ketergantungan dari modul Phase 2 |
| U-12 | Promo lanjutan: V-9…V-14, auto promo, `free_slot`, stacking | Phase 4 | Lanjutan U-6 Phase 1. Event memakai promo lewat `allow_promo` dengan aturan dasar yang sudah ada |
| U-13 | Usulan pemotongan deposit otomatis (D-10 Opsi B) | menunggu D-10 | Jurnal T-7/T-8 sudah menampung ketiga opsi; yang belum ada hanya layar usulan perhitungan |
| U-14 | PDF tagihan & kontrak di server | pasca-v1 | BR-T-31 — v1 memakai rincian HTML + cetak dari browser |
| U-15 | Pembayaran online mandiri tenant (Xendit Invoice) | pasca-v1 | [09 § 10](../docs/09-MODULE-TENANT.md#10-out-of-scope) — kandidat integrasi pertama setelah v1 |
| U-16 | Event berulang (recurring) | pasca-v1 | Kandidat **v2-tinggi** ([ROADMAP § 5.5](ROADMAP.md#55-ditunda-dari-phase-2)) |
| U-17 | Impor otomatis file settlement gateway | pasca-v1 | Data settlement dimasukkan admin. Saldo `1-1300` yang menumpuk adalah **keterbatasan v1 yang wajib dikomunikasikan ke client**, bukan bug (E-8 Finance, RK-2-10) |
| U-18 | Jurnal penutup otomatis ke `3-9000` & neraca formal | pasca-v1 | BR-F-63 — itu pekerjaan akuntan |
