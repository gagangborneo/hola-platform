# Deploy produksi dengan Dokploy

## Sekali saat provisioning

1. Provision VPS, pasang Docker/Dokploy, firewall, swap, dan alert disk 80% (F0-81).
2. Di Dokploy buat empat aplikasi: `hola-api`, `hola-worker`, `hola-web`, dan `hola-admin`.
   Aplikasi worker memakai `apps/api/Dockerfile` dengan command `node dist/worker.js`.
3. Tambahkan domain final di Traefik/Dokploy, aktifkan Let's Encrypt dan HSTS
   `max-age=31536000; includeSubDomains`. `queue` harus memakai basic auth serta IP allowlist.
4. Masukkan semua key dari `.env.example` masing-masing aplikasi ke secret store Dokploy. Jangan
   menyimpan file `.env` atau DSN/kredensial R2 di repository.
5. Hanya aplikasi API yang menjalankan release step `pnpm db:migrate`; worker, web, dan admin
   **tidak** boleh menjalankan migration di `CMD` maupun lifecycle start.
6. Buat webhook deploy Dokploy dan simpan URL-nya sebagai GitHub Secrets:
   `DOKPLOY_WEBHOOK_API`, `DOKPLOY_WEBHOOK_WORKER`, `DOKPLOY_WEBHOOK_WEB`, dan
   `DOKPLOY_WEBHOOK_ADMIN`.

## Setiap deploy

`deploy.yml` hanya berjalan setelah workflow CI untuk `main` sukses dan memanggil webhook dalam
urutan API → worker → web → admin. Periksa log release migration sebelum melanjutkan ke worker.

Setelah deploy pertama, verifikasi:

```bash
curl --fail https://<api-domain>/healthz
curl --fail https://<api-domain>/readyz
```

Di staging, matikan Redis sesaat; `/readyz` harus tetap HTTP 200 dengan status `degraded`, lalu
hidupkan Redis dan pastikan kembali sehat. Catat hasilnya sebagai bukti DoD-0-08.

## Monitoring dan backup

- Buat delapan monitor Uptime Kuma sesuai tabel `docs/02-INFRASTRUCTURE.md` §9 dan sambungkan ke
  kanal alert yang benar-benar dibaca.
- Buat tiga URL healthchecks.io: worker (push tiap 60 detik), backup (ping setelah J-30 sukses),
  dan VPS/API (container `docker/healthcheck`, cek `/healthz` lalu ping setiap 5 menit). Masukkan
  dua URL pertama sebagai `HEALTHCHECKS_WORKER_PING_URL` dan
  `HEALTHCHECKS_BACKUP_PING_URL`; URL ketiga hidup hanya di secret container healthcheck.
- Siapkan R2 `hola-backup` dengan versioning dan lifecycle 30 harian + 12 bulanan. Jalankan
  restore drill sebelum menerima data bisnis.
