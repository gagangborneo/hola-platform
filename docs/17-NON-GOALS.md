# 17 — NON-GOALS (Yang TIDAK Dibangun di v1)

> **Tujuan dokumen ini:** mencegah scope creep. Ini daftar fitur yang **sengaja tidak dibangun**,
> bukan daftar fitur yang terlupakan.
>
> **Aturan untuk AI coding assistant:** jika sebuah permintaan atau ide menyentuh item di
> dokumen ini, **jangan bangun**. Katakan bahwa itu non-goal v1, tunjuk baris di dokumen ini,
> dan tanyakan apakah client benar-benar ingin mengubah scope. Menambahkan fitur non-goal
> "sekalian karena mudah" adalah cara paling umum proyek ini gagal selesai.

---

## 1. Cara Memakai Dokumen Ini

| Situasi | Tindakan |
|---|---|
| Menemukan ide fitur saat mengerjakan modul | Cek dokumen ini lebih dulu. Jika ada di sini → jangan bangun |
| Ide tidak ada di dokumen ini **dan** tidak ada di dokumen modul mana pun | Ia **juga** non-goal secara default. Fitur v1 adalah yang tertulis di [00 § 5](00-OVERVIEW.md#5-daftar-modul-fitur-v1), bukan yang tidak dilarang |
| Client meminta fitur non-goal | Sampaikan konsekuensinya (modul baru? liability? mengubah keputusan yang sudah dikunci?), lalu tunggu keputusan. Jangan mulai membangun |
| Fitur non-goal ternyata **prasyarat** fitur v1 | Laporkan sebagai kontradiksi PRD. Jangan diam-diam membangunnya |

### Kolom "Kandidat"

| Nilai | Arti |
|---|---|
| **v2-tinggi** | Kemungkinan besar dibutuhkan segera setelah v1; desain v1 sudah menyiapkan tempatnya |
| **v2** | Wajar dipertimbangkan setelah v1 |
| **kemungkinan tidak** | Bukan arah produk ini; membutuhkan pertimbangan bisnis ulang |
| **tidak akan** | Bertentangan dengan prinsip produk atau berisiko tinggi |

---

## 2. Booking & Lapangan

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-B-01 | **Booking berulang (recurring)** — "setiap Sabtu 19:00 selama 3 bulan" | Butuh: pembuatan klaim massal ke masa depan, penanganan bentrok sebagian, pembayaran per sesi vs sekaligus, pembatalan satu instance vs seluruh seri. Empat sub-alur baru | **v2-tinggi** |
| NG-B-02 | **Split payment antar pemain** — satu booking dibayar 4 orang | Butuh: pelacakan bagian per orang, penanganan sebagian bayar, refund per orang, dan hold yang bergantung pembayaran terakhir | v2 |
| NG-B-03 | **Waitlist untuk slot lapangan** | Slot bersifat sangat spesifik (jam & lapangan tertentu); daftar tunggu jarang berguna. Waitlist hanya ada untuk event ([10 § 5](10-MODULE-EVENT.md#5-kuota--waitlist)) | kemungkinan tidak |
| NG-B-04 | **Notifikasi saat slot yang diinginkan tersedia** | Butuh entitas "minat" + pemantauan perubahan `slot_claims` | v2 |
| NG-B-05 | **Dynamic pricing / surge** berbasis permintaan | Pipeline harga sengaja deterministik & dapat diaudit ([07 § 3](07-MODULE-PAYMENT.md#3-pricing-pipeline-satu-satunya-sumber-perhitungan-harga)). Harga yang berubah sendiri sulit dijelaskan ke customer | kemungkinan tidak |
| NG-B-06 | **Paket kuota jam prabayar** — beli 10 jam, pakai kapan saja | **Liability keuangan** + modul saldo + kedaluwarsa. Lihat D-09 Opsi C ([13 § 3](13-MODULE-CRM-HRIS.md#3-loyalty--membership)) | v2 |
| NG-B-07 | **Deposit / pembayaran sebagian** untuk booking lapangan | Hanya lunas atau tunai penuh. Pembayaran parsial **hanya** untuk tagihan tenant | kemungkinan tidak |
| NG-B-08 | **Booking lintas tanggal** dalam satu transaksi | BR-B-01. Buat dua booking | kemungkinan tidak |
| NG-B-09 | **Operasi lewat tengah malam** untuk slot lapangan (mis. 23:00–01:00) | Membuat `slot_date` ambigu dan merusak invalidasi cache per tanggal ([03 § 20 DM-4](03-DATA-MODEL.md#20-edge-cases-data-model)) | v2 |
| NG-B-10 | **Jam operasional terpisah dalam satu hari** (mis. tutup 12:00–14:00) | Satu rentang per hari; penutupan memakai `court_maintenances` | v2 |
| NG-B-11 | **Perpanjangan hold slot** | BR-B-37. Hold yang dapat diperpanjang tidak lagi membatasi apa pun | tidak akan |
| NG-B-12 | **QR code check-in mandiri** oleh customer | Check-in oleh staff adalah pilar anti-abuse poin ([12 § 8 AB-1](12-MODULE-GAMIFICATION.md#81-ancaman--mitigasi)) | v2 |
| NG-B-13 | **Rating & ulasan lapangan** | Butuh moderasi | v2 |
| NG-B-14 | **Slot berdurasi bebas** (bukan grid) | Membutuhkan `EXCLUDE USING gist` + `btree_gist`, dan mengubah seluruh mekanisme klaim ([03 § 8.2](03-DATA-MODEL.md#82-definisi-slot--grid)) | kemungkinan tidak |
| NG-B-15 | **Perhitungan selisih harga otomatis saat reschedule ke slot lebih mahal** | BR-B-55. Menagih selisih membuat booking berada di keadaan setengah lunas | v2 |
| NG-B-16 | **Booking korporat** dengan penagihan bulanan ke perusahaan | Butuh entitas perusahaan + piutang customer (v1 tidak punya piutang customer) | v2 |

## 3. Pembayaran & Keuangan

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-P-01 | **Wallet / saldo customer** (top-up, kredit dari pembatalan) | **Liability keuangan** + modul saldo + kedaluwarsa. Prasyarat kebijakan refund Opsi C ([06 § 7](06-MODULE-BOOKING.md#7-kebijakan-pembatalan--refund-butuh-keputusan-client)) | v2 |
| NG-P-02 | **Xendit sebagai provider aktif** | Port interface disiapkan; implementasi tidak dibangun ([07 § 2](07-MODULE-PAYMENT.md#2-pemilihan-payment-gateway-keputusan-final)) | v2-tinggi (untuk invoicing tenant) |
| NG-P-03 | **Impor otomatis file settlement** gateway | v1: admin memasukkan `gateway_fee_amount` & `settled_amount` manual (BR-P-45). Konsekuensinya diakui di [14 § 8 E-8](14-MODULE-FINANCE.md#8-edge-cases) | **v2-tinggi** |
| NG-P-04 | **Pembayaran berulang / cicilan / langganan** | Butuh modul langganan + penanganan kegagalan pembayaran berulang | v2 |
| NG-P-05 | **Biaya kanal dibebankan ke customer per metode** | Metode baru diketahui setelah Snap dibuka; memaksanya membatalkan manfaat Snap ([07 § 3.3 P9](07-MODULE-PAYMENT.md#33-detail-per-step)) | kemungkinan tidak |
| NG-P-06 | **Multi-mata uang** | Hanya IDR | tidak akan |
| NG-P-07 | **Faktur pajak resmi / e-Faktur** | Sistem menyediakan data pendapatan; pelaporan pajak oleh akuntan | kemungkinan tidak |
| NG-P-08 | **Refund otomatis tanpa persetujuan admin** untuk pembatalan biasa | Uang keluar selalu butuh keputusan manusia. Pengecualian: pembatalan dari pihak Hola (BR-P-53) | tidak akan |
| NG-P-09 | **Manajemen dispute / chargeback** | Ditangani manual lewat dashboard Midtrans | kemungkinan tidak |
| NG-P-10 | **Payout / disbursement** ke tenant, coach, atau bagi hasil | Butuh Xendit + entitas penerima + jadwal pembayaran | v2 |
| NG-P-11 | **Penyusutan aset tetap** & register aset | Bukan jurnal sederhana lagi | kemungkinan tidak |
| NG-P-12 | **Rekonsiliasi bank otomatis** (impor mutasi rekening) | Butuh integrasi bank atau parsing file | v2 |
| NG-P-13 | **Anggaran & analisis varians** | Bukan kebutuhan v1 | v2 |
| NG-P-14 | **Cost center / alokasi beban per departemen** | Organisasi terlalu kecil | kemungkinan tidak |
| NG-P-15 | **Neraca formal & laporan arus kas** | v1 menyediakan posisi kas, bukan neraca ([14 § 7](14-MODULE-FINANCE.md#7-laporan)) | v2 |
| NG-P-16 | **Jurnal penutup otomatis** ke laba ditahan | Pekerjaan akuntan | kemungkinan tidak |
| NG-P-17 | **Purchase order & manajemen vendor** | Pengeluaran dicatat langsung | kemungkinan tidak |
| NG-P-18 | **Persetujuan berjenjang untuk pengeluaran** | Batas nominal per role sudah cukup | kemungkinan tidak |
| NG-P-19 | **Integrasi ke software akuntansi** (Accurate, Zahir, Xero) | Jembatannya ekspor CSV | v2 |
| NG-P-20 | **Utang usaha dengan jadwal jatuh tempo & pengingat** | Akun `2-1500` ada tanpa modul manajemen utang | v2 |

## 4. Promo & Diskon

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-PR-01 | **Stacking promo** | Maksimum satu promo per transaksi (D-02, [08 § 4](08-MODULE-PROMO.md#4-aturan-stacking-butuh-keputusan-client)). Biaya promo maksimum harus dapat dihitung dari satu baris `promos` | v2 |
| NG-PR-02 | **Diskon berbasis tier/membership** | `tier_discount_amount` selalu 0 di v1. Mengaktifkannya membuka pertanyaan stacking kedua | v2 |
| NG-PR-03 | **Voucher personal per user** (kode unik hasil generate massal) | Butuh generator + distribusi + pelacakan per kode | **v2-tinggi** |
| NG-PR-04 | **Bundle / paket** (mis. 3 jam + sewa raket harga khusus) | Butuh entitas produk komposit di pipeline harga | v2 |
| NG-PR-05 | **Promo berlaku sebagian** atas slot tertentu dalam satu booking | Perhitungan & komunikasi ke customer jadi rumit ([08 § 9 E-10](08-MODULE-PROMO.md#9-edge-cases)) | kemungkinan tidak |
| NG-PR-06 | **Kupon yang dapat dihadiahkan** antar user | Membuka celah abuse & butuh pelacakan kepemilikan | kemungkinan tidak |
| NG-PR-07 | **Diskon otomatis berbasis ML / riwayat belanja** | Tidak dapat diaudit | tidak akan |
| NG-PR-08 | **A/B testing promo** | Butuh infrastruktur eksperimen | kemungkinan tidak |
| NG-PR-09 | **Gift card / prabayar** | Liability keuangan | kemungkinan tidak |
| NG-PR-10 | **Mengembalikan kuota promo saat refund** | Membuka pola pesan-pakai-batalkan berulang (BR-PR-57) | tidak akan |
| NG-PR-11 | **Promo ulang tahun otomatis** | Butuh NG-PR-03 (voucher personal) lebih dulu | v2 |
| NG-PR-12 | **Diskon manual bebas oleh staff** (mengubah harga langsung) | Semua diskon harus lewat `promos` agar tercatat & dapat dilaporkan ([08 § 9 E-16](08-MODULE-PROMO.md#9-edge-cases)) | tidak akan |

## 5. Event & Turnamen

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-E-01 | **Event berulang (recurring)** — open play setiap Sabtu otomatis | Admin membuat satu per satu di v1 | **v2-tinggi** |
| NG-E-02 | **Format turnamen selain knockout & round robin** — double elimination, grup + gugur, Swiss, ladder | Dibatasi eksplisit ([11 § 2](11-MODULE-MATCH.md#2-format-turnamen-v1)) | v2 |
| NG-E-03 | **Format sosial padel Americano / Mexicano** | Format rotasi pasangan yang sangat populer untuk open play; butuh algoritma penjadwalan & penilaian sendiri | **v2-tinggi** |
| NG-E-04 | **Double round robin** (home-away) | — | v2 |
| NG-E-05 | **Babak gugur setelah fase grup** | Ini format ketiga, bukan variasi ([11 § 2.2](11-MODULE-MATCH.md#22-round-robin-setengah-kompetisi)) | v2 |
| NG-E-06 | **Entitas coach/instruktur** dengan profil, jadwal, dan honor | Nama coach hanya teks di deskripsi event | v2 |
| NG-E-07 | **Pelaporan skor oleh peserta** + konfirmasi lawan + alur sengketa | Pilar anti-abuse poin ([11 § 6](11-MODULE-MATCH.md#6-input-skor--siapa-yang-berhak)) | v2 |
| NG-E-08 | **Papan skor live / skor per game real-time** | Skor hanya disimpan saat pertandingan selesai | v2 |
| NG-E-09 | **Roster tim lengkap** untuk turnamen tim | Hanya kapten yang didata; poin hanya ke kapten | v2 |
| NG-E-10 | **Rating pemain** (Elo, UTR, atau peringkat berbasis kekuatan lawan) | Berbeda dari poin gamification; butuh model matematis & komunikasi hati-hati | v2 |
| NG-E-11 | **Pembatalan satu match** tanpa membatalkan turnamen | Konsekuensinya terlihat di [11 § 11 E-20](11-MODULE-MATCH.md#11-edge-cases) | **v2-tinggi** |
| NG-E-12 | **Penjadwalan bracket otomatis** (auto-assign court & waktu untuk semua match) | Admin menjadwalkan per match | v2 |
| NG-E-13 | **Aturan istirahat minimum antar match** untuk satu peserta | Divalidasi manual admin | v2 |
| NG-E-14 | **Bracket yang dapat diedit manual** (drag & drop peserta) | Membuka celah manipulasi hasil | kemungkinan tidak |
| NG-E-15 | **Statistik pertandingan detail** (ace, winner, unforced error) | Butuh input granular saat pertandingan | kemungkinan tidak |
| NG-E-16 | **Tiket bernomor / kursi tertentu** untuk event | Kuota tanpa nomor kursi | tidak akan |
| NG-E-17 | **Pendaftaran grup** (satu orang mendaftarkan 4 orang sekaligus) | Butuh penanganan identitas & pembayaran gabungan | v2 |
| NG-E-18 | **Harga tiket bertingkat** (early bird, member vs non-member) | Satu `fee_amount` per event; diskon lewat promo | v2 |
| NG-E-19 | **Kapasitas per level** dalam satu event | Buat event terpisah | kemungkinan tidak |
| NG-E-20 | **Sertifikat juara / e-certificate kehadiran** | — | v2 |
| NG-E-21 | **Hadiah / prize pool** dan pencatatan distribusinya | Butuh integrasi ke finance | v2 |
| NG-E-22 | **Pembatalan event otomatis** saat `min_participants` tidak tercapai | Keputusan dengan konsekuensi reputasi, harus manusia (BR-E-10) | tidak akan |
| NG-E-23 | **Referee/umpire sebagai entitas** dengan penugasan | — | kemungkinan tidak |
| NG-E-24 | **Streaming atau rekaman pertandingan** | — | kemungkinan tidak |
| NG-E-25 | **Integrasi kalender (ICS / Google Calendar)** | — | v2 |

## 6. Gamification

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-G-01 | **Penukaran poin** menjadi uang, diskon, atau hadiah | D-03. Membuat poin menjadi **liability keuangan** dan menaikkan standar seluruh anti-abuse ([12 § 9](12-MODULE-GAMIFICATION.md#9-nilai-tukar-poin-butuh-keputusan-client)) | v2 |
| NG-G-02 | **Kedaluwarsa poin** | Konsekuensi Opsi A: tanpa liability, tidak ada yang perlu dibatasi | v2 (bersama NG-G-01) |
| NG-G-03 | **Transfer poin antar user** | Membuka celah jual-beli poin | tidak akan |
| NG-G-04 | **Leaderboard mingguan atau harian** | Hanya bulanan + sepanjang masa | v2 |
| NG-G-05 | **Leaderboard per court / gender / usia / level** | Hanya `global` dan `sport:{code}` | v2 |
| NG-G-06 | **Leaderboard teman / grup privat** | Butuh entitas relasi antar user | v2 |
| NG-G-07 | **Tantangan / misi harian** | Modul tersendiri | v2 |
| NG-G-08 | **Musim (season) bertema dengan hadiah** | Butuh NG-G-01 | kemungkinan tidak |
| NG-G-09 | **Poin berbasis nominal transaksi** | BR-G-90. Mengikat poin ke rupiah memberi keuntungan berlipat pada jam peak | tidak akan |
| NG-G-10 | **Tier yang turun karena tidak aktif** | BR-G-71 | v2 |
| NG-G-11 | **Pencabutan badge** | Badge permanen (BR-G-80) | tidak akan |
| NG-G-12 | **Notifikasi perubahan peringkat real-time** | Hanya hasil akhir periode | kemungkinan tidak |
| NG-G-13 | **Berbagi pencapaian ke media sosial** | — | v2 |

## 7. Tenant Cafe

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-T-01 | **POS / kasir cafe** | Hola tidak mengelola penjualan tenant | tidak akan |
| NG-T-02 | **Inventaris & stok barang cafe** | — | tidak akan |
| NG-T-03 | **Revenue sharing berbasis penjualan aktual** | Butuh data POS (NG-T-01). Kolom `revenue_share_percent` ada tetapi tidak diproses | kemungkinan tidak |
| NG-T-04 | **Pembayaran online mandiri oleh tenant** lewat gateway | v1: dicatat manual staff. Kandidat pertama integrasi Xendit Invoice | **v2-tinggi** |
| NG-T-05 | **Generasi PDF tagihan/kontrak di server** | v1: rincian HTML + cetak dari browser | v2 |
| NG-T-06 | **Tanda tangan digital kontrak (e-signature)** | Dokumen ditandatangani di luar sistem lalu diunggah | v2 |
| NG-T-07 | **Denda berbunga / berulang harian** | v1: denda satu kali (BR-T-53) | v2 |
| NG-T-08 | **Sub-meter listrik & air per unit** dan penagihan berdasarkan pemakaian | Service charge bersifat tetap | v2 |
| NG-T-09 | **Suspensi/pemutusan otomatis** karena tunggakan | Tindakan berdampak besar, harus manusia (BR-T-60) | tidak akan |
| NG-T-10 | **Manajemen aset & tiket perbaikan unit cafe** | — | v2 |
| NG-T-11 | **Portal tenant untuk mengelola menu/promosi cafe** atau tampil di app customer | Ini produk lain | kemungkinan tidak |
| NG-T-12 | **Perpanjangan kontrak otomatis** | Selalu tindakan admin | tidak akan |
| NG-T-13 | **Escrow / rekening bersama** | — | tidak akan |

## 8. CRM & HRIS

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-C-01 | **Email campaign builder / newsletter** | Pakai layanan terpisah + ekspor CSV | kemungkinan tidak |
| NG-C-02 | **Marketing automation / drip campaign** | Butuh mesin aturan & penjadwalan per user | v2 |
| NG-C-03 | **Segmentasi dinamis tersimpan** | v1: filter ad-hoc | v2 |
| NG-C-04 | **Sales pipeline / deal stage** | Hola tidak menjual lewat pipeline | tidak akan |
| NG-C-05 | **Helpdesk / tiket bantuan** | Keluhan lewat WhatsApp/telepon | v2 |
| NG-C-06 | **NPS / CSAT / survei** | Modul tersendiri | v2 |
| NG-C-07 | **Prediksi churn / LTV berbasis model** | Butuh data historis panjang | kemungkinan tidak |
| NG-C-08 | **Referral berhadiah uang atau diskon** | Referral hanya memberi poin | v2 |
| NG-C-09 | **Merge dua akun customer duplikat** | Operasi berisiko yang menyentuh booking, payment, poin, dan jurnal | v2 |
| NG-C-10 | **Import customer massal dari CSV** | Customer lahir dari registrasi | kemungkinan tidak |
| NG-C-11 | **Kartu member fisik / barcode** | Identifikasi memakai nama/telepon | kemungkinan tidak |
| NG-C-12 | **Membership berbayar (langganan)** | D-09. Butuh modul langganan + diskon tier aktif ([13 § 3](13-MODULE-CRM-HRIS.md#3-loyalty--membership)) | v2 |
| NG-H-01 | **Penggajian (payroll), slip gaji, PPh 21, BPJS** | Risiko tinggi jika salah; sistem hanya mengekspor data absensi | tidak akan |
| NG-H-02 | **Perhitungan lembur & upah lembur** | `work_minutes` disediakan; tarif dihitung di luar | v2 |
| NG-H-03 | **Saldo & kuota cuti** | Butuh aturan hak cuti per masa kerja & carry-over (BR-H-42) | v2 |
| NG-H-04 | **Persetujuan berjenjang** | Organisasi datar | kemungkinan tidak |
| NG-H-05 | **Geofencing / GPS check-in / selfie / fingerprint** | Privasi lokasi & biometrik; absensi memakai kiosk | v2 |
| NG-H-06 | **Manajemen kinerja / KPI / penilaian** | Domain terpisah | kemungkinan tidak |
| NG-H-07 | **Rekrutmen / ATS** | Domain terpisah | tidak akan |
| NG-H-08 | **Onboarding checklist & pelatihan karyawan** | Domain terpisah | kemungkinan tidak |
| NG-H-09 | **Struktur organisasi / hierarki atasan-bawahan** | Tidak dibutuhkan pada skala ini | kemungkinan tidak |
| NG-H-10 | **Shift swap antar karyawan** | Admin mengubah jadwal langsung | v2 |
| NG-H-11 | **Notifikasi pengingat shift** | Jadwal dikomunikasikan lewat grup pesan | **v2-tinggi** |
| NG-H-12 | **Komisi / insentif berbasis penjualan** | Domain terpisah | v2 |
| NG-H-13 | **Validasi "harus ada staff saat ada booking"** | Menghubungkan shift ke slot menambah kompleksitas tanpa manfaat jelas (BR-H-17) | kemungkinan tidak |
| NG-H-14 | **Kontrak kerja digital & tanda tangan** | Dokumen di luar sistem | kemungkinan tidak |

## 9. Mobile

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-M-01 | **Fungsi admin/staff/tenant di mobile** | Dashboard hanya di web | v2 (mode staff untuk check-in) |
| NG-M-02 | **SDK native Midtrans** | Memakai Snap WebView | kemungkinan tidak |
| NG-M-03 | **Menonton tutorial offline / unduh video** | Konsekuensi hosting Opsi A (D-05) | v2 |
| NG-M-04 | **Chat antar pemain atau dengan admin** | Modul besar dengan kebutuhan moderasi | kemungkinan tidak |
| NG-M-05 | **Matchmaking / mencari partner bermain** | Fitur menarik tetapi modul tersendiri | **v2-tinggi** |
| NG-M-06 | **Feed sosial, komentar, like** | Bukan arah produk | tidak akan |
| NG-M-07 | **Integrasi wearable / HealthKit / Google Fit** | — | v2 |
| NG-M-08 | **Pelacakan GPS / sensor gerak** saat bermain | Privasi + baterai + nilai tidak jelas | kemungkinan tidak |
| NG-M-09 | **Widget layar utama** | — | v2 |
| NG-M-10 | **Apple Watch / Wear OS** | — | tidak akan |
| NG-M-11 | **Layout tablet khusus** | App tetap berjalan dengan layout ponsel | kemungkinan tidak |
| NG-M-12 | **Bahasa selain Indonesia** | — | v2 |
| NG-M-13 | **Login biometrik** (Face ID / fingerprint) | — | v2 |
| NG-M-14 | **Penulisan offline** selain queue aktivitas | BR-MB-72 | tidak akan |
| NG-M-15 | **In-app purchase lewat store** | Pembayaran lewat gateway lokal | tidak akan |
| NG-M-16 | **Notifikasi realtime perubahan ketersediaan slot** | Butuh websocket | kemungkinan tidak |

## 10. Auth & Keamanan

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-A-01 | **Social login** (Google, Apple, Facebook) | Struktur `users` sudah menyiapkannya (`password_hash` nullable) | **v2-tinggi** |
| NG-A-02 | **Two-factor authentication / TOTP** | — | v2 |
| NG-A-03 | **Magic link login** | — | v2 |
| NG-A-04 | **SSO / SAML / LDAP** | Bukan konteks bisnis ini | tidak akan |
| NG-A-05 | **Permission granular per user / role builder** | 4 role tetap ([05 § 2](05-AUTH.md#2-role--definisi)) | v2 |
| NG-A-06 | **Multi-role per user** | Satu role per user; karyawan yang juga customer butuh dua akun | v2 |
| NG-A-07 | **Impersonation** ("login as user") untuk admin | Risiko tinggi; butuh audit ketat | v2 |
| NG-A-08 | **Device fingerprinting / risk-based auth** | — | kemungkinan tidak |
| NG-A-09 | **Password expiry berkala** | Bertentangan dengan panduan NIST modern | tidak akan |
| NG-A-10 | **CAPTCHA** | Mengandalkan rate limit + lockout + Cloudflare | v2 |
| NG-A-11 | **Login OTP aktif** | Endpoint ada tetapi provider SMS/WhatsApp belum diputuskan (D-04). Lihat [05 § 8](05-AUTH.md#8-registrasi--login) | **v2-tinggi** |
| NG-A-12 | **Audit log yang dapat dilihat customer** atas akunnya | — | kemungkinan tidak |

## 11. Arsitektur & Infrastruktur

| # | Non-goal | Alasan | Kandidat |
|---|---|---|---|
| NG-I-01 | **Microservice** | `apps/api` adalah modular monolith | tidak akan |
| NG-I-02 | **GraphQL** | Type-safety datang dari `hono/client` | tidak akan |
| NG-I-03 | **Event bus eksternal** (Kafka/NATS/RabbitMQ) | BullMQ + outbox cukup | kemungkinan tidak |
| NG-I-04 | **Websocket / SSE / realtime ke browser** | Ketersediaan slot memakai polling + invalidasi cache | v2 |
| NG-I-05 | **Multi-tenancy** (satu instance untuk beberapa badan usaha) | Aplikasi single-tenant. Jangan pernah menambah `tenant_id` untuk isolasi | tidak akan |
| NG-I-06 | **Multi-venue / multi-cabang** | Tabel `venues` ada dengan **tepat satu baris**; jangan bangun fitur multi-venue | v2 |
| NG-I-07 | **Kubernetes / service mesh / autoscaling** | Dokploy di satu VPS cukup | kemungkinan tidak |
| NG-I-08 | **Read replica / failover PostgreSQL otomatis** | — | v2 |
| NG-I-09 | **WAL archiving / point-in-time recovery** | v1: `pg_dump` harian, RPO ≤ 24 jam ([02 § 10](02-INFRASTRUCTURE.md#10-backup--restore)) | **v2-tinggi** |
| NG-I-10 | **Redis Cluster / Sentinel** | Kehilangan Redis tidak fatal secara desain | tidak akan |
| NG-I-11 | **Secret manager eksternal** (Vault/Doppler) | Dokploy + GitHub Secrets | v2 |
| NG-I-12 | **Infrastructure as Code** (Terraform/Pulumi) | Provisioning manual + runbook | v2 |
| NG-I-13 | **Log aggregation terpusat** (Loki/ELK) | v1: `docker logs` + Sentry | **v2-tinggi** |
| NG-I-14 | **Blue/green atau canary deployment** | Rolling restart cukup | kemungkinan tidak |
| NG-I-15 | **Load testing terotomasi di CI** | — | v2 |
| NG-I-16 | **API publik untuk pihak ketiga** (API key, OAuth client credentials) | — | v2 |
| NG-I-17 | **Webhook keluar** dari Hola ke sistem lain | — | v2 |
| NG-I-18 | **Feature flag service eksternal** | Flag di `app_settings` + env | kemungkinan tidak |
| NG-I-19 | **Field selection / sparse fieldset / include dinamis** di API | Bentuk response ditentukan server | tidak akan |
| NG-I-20 | **Batch request** (beberapa operasi dalam satu HTTP call) | Kecuali `POST /shift-assignments` | tidak akan |
| NG-I-21 | **Internasionalisasi response API** | `Accept-Language` hanya `id` | v2 |
| NG-I-22 | **Full-text search** (tsvector / mesin pencarian) | `ILIKE` + index trigram jika perlu | v2 |
| NG-I-23 | **Partisi tabel** | Dipertimbangkan setelah > 5 juta baris | v2 |
| NG-I-24 | **Row-level security PostgreSQL** | Otorisasi di service layer | kemungkinan tidak |
| NG-I-25 | **Materialized view untuk laporan** | Memakai `finance_daily_summaries` + agregat langsung | v2 |
| NG-I-26 | **Kolom terenkripsi di level database** | Data sensitif dilindungi RBAC | v2 |
| NG-I-27 | **Resize/transcode gambar di server** | Client mengompres sebelum upload | v2 |
| NG-I-28 | **PWA / instalasi web app** | Mobile memakai Expo | kemungkinan tidak |

## 12. Kode & Tooling

| # | Non-goal | Alasan |
|---|---|---|
| NG-K-01 | **Dependency injection container** | Dependensi lewat parameter `ctx` |
| NG-K-02 | **Repository generik / base class CRUD** | Query eksplisit per kebutuhan |
| NG-K-03 | **OpenAPI spec + client codegen** | `hono/client` sudah memberi type-safety |
| NG-K-04 | **Test E2E browser (Playwright/Cypress) & mobile (Detox/Maestro)** | Tiga tingkat test di [16 § 8](16-CONVENTIONS.md#8-testing-vitest) |
| NG-K-05 | **Visual regression testing** | — |
| NG-K-06 | **Mutation testing** | — |
| NG-K-07 | **Storybook / component catalog** | — |
| NG-K-08 | **Design system package terpisah** | Duplikasi kecil antara web & admin diterima di v1 |
| NG-K-09 | **Changesets / versioning package internal** | Package internal tidak dipublikasikan |
| NG-K-10 | **Husky / commitlint hook lokal** | CI yang menegakkan |
| NG-K-11 | **Coverage threshold global** | Hanya folder kritis (BR-TT-15) |
| NG-K-12 | **Monorepo generator / scaffolding CLI** | — |

---

## 13. Ringkasan: Sepuluh Non-Goal yang Paling Sering Diminta

Diurutkan berdasarkan seberapa sering hal ini muncul sebagai "sekalian saja", dengan
konsekuensi nyatanya:

| # | Permintaan | Konsekuensi jika dibangun |
|---|---|---|
| 1 | "Sekalian bikin booking berulang tiap Sabtu" | 4 sub-alur baru: klaim massal masa depan, bentrok sebagian, pembayaran per sesi vs sekaligus, batal satu vs seri (NG-B-01) |
| 2 | "Promo-nya bisa digabung dong" | Biaya promo tidak lagi dapat dihitung dari satu baris; pengujian kombinasi meledak; risiko margin (NG-PR-01) |
| 3 | "Poinnya bisa ditukar diskon ya" | **Liability keuangan** + modul penukaran + kedaluwarsa + seluruh anti-abuse naik standar (NG-G-01) |
| 4 | "Member bayar bulanan dapat diskon" | Modul langganan + diskon tier aktif + pertanyaan stacking + penanganan gagal bayar berulang (NG-C-12, NG-PR-02) |
| 5 | "Pemain input skor sendiri saja biar cepat" | Kolusi kemenangan palsu; butuh konfirmasi lawan + alur sengketa (NG-E-07) |
| 6 | "Tenant bisa bayar online sendiri" | Butuh provider kedua (Xendit) + alur invoice online (NG-T-04) — tetapi ini kandidat v2 paling wajar |
| 7 | "Bikin POS untuk cafe-nya juga" | Produk yang sama sekali berbeda (NG-T-01) |
| 8 | "Payroll-nya sekalian" | Risiko hukum & pajak; keliru berarti masalah nyata bagi karyawan (NG-H-01) |
| 9 | "Bisa lihat slot tersedia realtime tanpa refresh" | Websocket + infrastruktur baru; polling + cache 60 detik sudah memadai (NG-I-04) |
| 10 | "Nanti untuk cabang kedua tinggal tambah venue" | Multi-venue menyentuh slot grid, harga, laporan, dan RBAC. Bukan penambahan baris (NG-I-06) |

---

## 14. Rujukan Silang

Setiap dokumen modul punya bagian **"Out of Scope"** sendiri yang lebih rinci untuk domainnya:

| Dokumen | Bagian |
|---|---|
| [01-ARCHITECTURE.md](01-ARCHITECTURE.md#9-yang-tidak-ada-di-arsitektur-v1) | § 9 |
| [02-INFRASTRUCTURE.md](02-INFRASTRUCTURE.md#13-out-of-scope-infrastruktur-v1) | § 13 |
| [03-DATA-MODEL.md](03-DATA-MODEL.md#21-out-of-scope-data-model-v1) | § 21 |
| [04-API-CONTRACT.md](04-API-CONTRACT.md#12-out-of-scope-api-v1) | § 12 |
| [05-AUTH.md](05-AUTH.md#11-out-of-scope-auth-v1) | § 11 |
| [06-MODULE-BOOKING.md](06-MODULE-BOOKING.md#12-out-of-scope) | § 12 |
| [07-MODULE-PAYMENT.md](07-MODULE-PAYMENT.md#9-out-of-scope) | § 9 |
| [08-MODULE-PROMO.md](08-MODULE-PROMO.md#10-out-of-scope) | § 10 |
| [09-MODULE-TENANT.md](09-MODULE-TENANT.md#10-out-of-scope) | § 10 |
| [10-MODULE-EVENT.md](10-MODULE-EVENT.md#10-out-of-scope) | § 10 |
| [11-MODULE-MATCH.md](11-MODULE-MATCH.md#12-out-of-scope) | § 12 |
| [12-MODULE-GAMIFICATION.md](12-MODULE-GAMIFICATION.md#12-out-of-scope) | § 12 |
| [13-MODULE-CRM-HRIS.md](13-MODULE-CRM-HRIS.md#10-out-of-scope) | § 10 |
| [14-MODULE-FINANCE.md](14-MODULE-FINANCE.md#9-out-of-scope) | § 9 |
| [15-MOBILE.md](15-MOBILE.md#12-out-of-scope) | § 12 |
| [16-CONVENTIONS.md](16-CONVENTIONS.md#11-out-of-scope) | § 11 |

Jika ada perbedaan antara dokumen ini dan bagian "Out of Scope" sebuah modul, **dokumen modul
yang menang** (ia lebih dekat ke detail domainnya) — dan perbedaan itu wajib dilaporkan agar
salah satunya diperbaiki.
