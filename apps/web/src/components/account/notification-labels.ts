import { TEMPLATE_CODE } from '@hola/shared'

/**
 * Terjemahan `template_code` menjadi kalimat berbahasa Indonesia (I1).
 *
 * Inbox menyimpan kode template dan payload, BUKAN kalimat jadi — teks email
 * dirakit worker saat mengirim (docs/02 § 7). Peta ini yang membuat baris inbox
 * terbaca tanpa memaksa API menyimpan salinan kedua dari setiap kalimat.
 */
interface NotificationCopy {
  title: string
  body: string
}

const COPY: Record<string, NotificationCopy> = {
  [TEMPLATE_CODE.AUTH_EMAIL_VERIFY]: {
    title: 'Verifikasi email',
    body: 'Tautan verifikasi email sudah dikirim ke alamat emailmu.',
  },
  [TEMPLATE_CODE.AUTH_PASSWORD_RESET]: {
    title: 'Reset password',
    body: 'Permintaan reset password diterima. Tautannya berlaku 1 jam.',
  },
  [TEMPLATE_CODE.AUTH_PASSWORD_CHANGED]: {
    title: 'Password diubah',
    body: 'Password akunmu berhasil diubah. Semua perangkat lain otomatis keluar.',
  },
  [TEMPLATE_CODE.AUTH_ACCOUNT_LOCKED]: {
    title: 'Akun terkunci sementara',
    body: 'Terlalu banyak percobaan login gagal. Akun dibuka otomatis setelah 15 menit.',
  },
  [TEMPLATE_CODE.BOOKING_CONFIRMED]: {
    title: 'Booking terkonfirmasi',
    body: 'Pembayaran diterima dan jadwal mainmu sudah dikunci.',
  },
  [TEMPLATE_CODE.BOOKING_CANCELLED]: {
    title: 'Booking dibatalkan',
    body: 'Pesananmu dibatalkan. Perkiraan pengembalian dana mengikuti kebijakan venue.',
  },
  [TEMPLATE_CODE.BOOKING_RECOVERED_AFTER_EXPIRY]: {
    title: 'Booking dipulihkan',
    body: 'Pembayaranmu masuk setelah masa tahan habis, dan jadwalnya berhasil diambil kembali.',
  },
  [TEMPLATE_CODE.BOOKING_FORCE_CANCELLED]: {
    title: 'Booking dibatalkan venue',
    body: 'Jadwalmu dibatalkan oleh pengelola. Dana dikembalikan penuh.',
  },
  [TEMPLATE_CODE.BOOKING_REMINDER_2H]: {
    title: 'Jadwal main 2 jam lagi',
    body: 'Bersiaplah — jadwal mainmu dimulai kurang dari 2 jam lagi.',
  },
  [TEMPLATE_CODE.PAYMENT_REFUND_AUTO_CREATED]: {
    title: 'Pengembalian dana diproses',
    body: 'Pengembalian dana otomatis dibuat untuk pesanan yang tidak dapat dilanjutkan.',
  },
  [TEMPLATE_CODE.PAYMENT_REFUND_COMPLETED]: {
    title: 'Pengembalian dana selesai',
    body: 'Dana sudah dikirim balik ke metode pembayaran asalmu.',
  },
  [TEMPLATE_CODE.PAYMENT_REFUND_REQUIRED]: {
    title: 'Pengembalian dana perlu ditindaklanjuti',
    body: 'Tim kami sedang memproses pengembalian dana pesananmu.',
  },
}

/**
 * Kode yang tidak dikenal tetap tampil sebagai baris utuh: inbox berisi riwayat
 * dan menyembunyikan barisnya lebih buruk daripada menampilkan judul generik —
 * apalagi setelah katalog template bertambah di rilis berikutnya.
 */
export function notificationCopy(templateCode: string): NotificationCopy {
  return (
    COPY[templateCode] ?? {
      title: 'Pemberitahuan',
      body: 'Ada pembaruan pada akunmu.',
    }
  )
}

/** Hanya `related_type` yang punya halaman pelanggan yang menghasilkan tautan. */
export function notificationHref(
  relatedType: string | null,
  relatedId: string | null,
): string | undefined {
  if (relatedType === 'booking' && relatedId) return `/akun/booking/${relatedId}`
  return undefined
}
