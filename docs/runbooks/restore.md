# Restore PostgreSQL

Runbook ini dipakai untuk drill dan insiden nyata. Jangan melakukan langkah pemulihan penuh
langsung pada database produksi tanpa membuat salinan database lama terlebih dahulu.

## Prasyarat

- Akses read ke remote rclone `hola` yang menunjuk ke bucket R2 `hola-backup`.
- `postgresql-client` versi 16, `rclone`, dan environment `DATABASE_URL` yang tepat.
- Untuk insiden produksi, aktifkan maintenance page Traefik dan hentikan `hola-api` serta
  `hola-worker` sebelum menukar database.

## Lima langkah restore

1. Ambil objek backup yang dipilih. Nama harus mengikuti pola
   `pg/YYYY/MM/hola-YYYYMMDD-HHmm.dump`.

   ```bash
   rclone copy hola:hola-backup/pg/2026/07/hola-20260727-0300.dump ./
   ```

2. Pulihkan selalu ke database sementara dahulu. Jangan menimpa `hola` pada percobaan pertama.

   ```bash
   createdb hola_restore
   pg_restore --dbname=hola_restore --jobs=4 --no-owner --no-privileges hola-20260727-0300.dump
   ```

3. Catat hasil empat query verifikasi berikut pada log drill.

   ```sql
   SELECT count(*) FROM bookings;
   SELECT count(*), sum(total_amount) FROM payments WHERE status = 'paid';
   SELECT count(*) FROM journal_entries;
   SELECT max(created_at) FROM audit_logs;
   ```

4. Untuk pemulihan penuh, hentikan traffic, rename database lama sebagai bukti forensik, lalu
   rename `hola_restore` menjadi `hola`. Setelah `DATABASE_URL` menunjuk database hasil restore,
   jalankan `pnpm db:migrate`; migration harus selesai bersih sebelum container dinaikkan.

5. Naikkan API dan worker, cek `/healthz` serta `/readyz`, lalu jalankan checklist pasca-restore
   di bawah.

## Checklist pasca-restore (wajib)

- [ ] Z1 — Restart worker agar scheduler BullMQ terdaftar ulang.
- [ ] Z2 — Jalankan `gamification.rebuildLeaderboard` karena Redis/ZSET dapat kosong.
- [ ] Z3 — Jalankan `payment.reconcilePending` untuk menyelaraskan status Midtrans.
- [ ] Z4 — Jalankan `booking.releaseExpiredHolds` untuk melepas hold basi.
- [ ] Z5 — Jalankan `system.postJournalEntries` untuk mengosongkan outbox finance.
- [ ] Z6 — Verifikasi `/readyz` dan kirim satu notifikasi uji.
- [ ] Z7 — Catat insiden/drill, RTO aktual, RPO aktual, dan masalah yang ditemukan.
