/**
 * Seed pengembangan Phase 0.
 *
 * Seluruh ID, waktu, dan salt dibuat tetap agar hasil `pnpm db:seed` dapat
 * diulang tanpa membuat fixture baru. Password tetap memakai pepper runtime
 * supaya hasilnya bisa diverifikasi oleh `apps/api` pada environment yang sama.
 */
import {
  addons,
  appSettings,
  courtOperatingHours,
  courts,
  createDb,
  notificationTemplates,
  priceRules,
  sports,
  users,
  venues,
} from '@hola/db'
import { NOTIFICATION_CHANNEL, SETTINGS_KEY, TEMPLATE_CODE, USER_ROLE } from '@hola/shared'
import { argon2id, hash } from 'argon2'
import { sql } from 'drizzle-orm'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL wajib diisi untuk menjalankan seed.')

const seedTime = new Date('2026-01-01T00:00:00.000Z')
const ids = {
  venue: '00000000-0000-7000-8000-000000000001',
  padel: '00000000-0000-7000-8000-000000000011',
  futsal: '00000000-0000-7000-8000-000000000012',
  badminton: '00000000-0000-7000-8000-000000000013',
  admin: '00000000-0000-7000-8000-000000000101',
  staff: '00000000-0000-7000-8000-000000000102',
  tenant: '00000000-0000-7000-8000-000000000103',
  customerOne: '00000000-0000-7000-8000-000000000104',
  customerTwo: '00000000-0000-7000-8000-000000000105',
  customerThree: '00000000-0000-7000-8000-000000000106',
} as const

const seedPassword = 'Hola12345!'
const seedPepper = process.env.PASSWORD_PEPPER ?? 'hola-local-dev-password-pepper'
const passwordSalt = Buffer.from('hola-platform-seed-password-salt-v1', 'utf8')

const argon2Options = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  salt: passwordSalt,
} as const

function passwordWithPepper(password: string): string {
  return `${password}${seedPepper}`
}

function courtId(index: number): string {
  return `00000000-0000-7000-8000-${String(index).padStart(12, '0')}`
}

const seedCourts = [
  { id: courtId(201), sportId: ids.padel, code: 'PDL-01', name: 'Padel Court 1', isIndoor: true },
  { id: courtId(202), sportId: ids.padel, code: 'PDL-02', name: 'Padel Court 2', isIndoor: true },
  { id: courtId(203), sportId: ids.padel, code: 'PDL-03', name: 'Padel Court 3', isIndoor: true },
  { id: courtId(204), sportId: ids.padel, code: 'PDL-04', name: 'Padel Court 4', isIndoor: true },
  {
    id: courtId(205),
    sportId: ids.futsal,
    code: 'FTS-01',
    name: 'Futsal Court 1',
    isIndoor: false,
  },
  {
    id: courtId(206),
    sportId: ids.badminton,
    code: 'BDM-01',
    name: 'Badminton Court 1',
    isIndoor: true,
  },
  {
    id: courtId(207),
    sportId: ids.badminton,
    code: 'BDM-02',
    name: 'Badminton Court 2',
    isIndoor: true,
  },
] as const

const defaultSettings = [
  [SETTINGS_KEY.BOOKING_HORIZON_DAYS, 60, 'Batas hari booking customer.'],
  [SETTINGS_KEY.MAX_CONFIRMED_BOOKINGS_PER_DAY, 2, 'Maksimum booking confirmed customer per hari.'],
  [SETTINGS_KEY.REQUIRE_CONTIGUOUS_SLOTS, false, 'Slot booking tidak wajib berurutan.'],
  [SETTINGS_KEY.RESCHEDULE_MIN_HOURS_BEFORE, 24, 'Batas minimum jam sebelum reschedule.'],
  [SETTINGS_KEY.RESCHEDULE_MAX_COUNT, 1, 'Jumlah maksimum reschedule per booking.'],
  [
    SETTINGS_KEY.REFUND_POLICY,
    {
      option: 'B',
      tiers: [
        { min_hours: 48, percent: 100 },
        { min_hours: 24, percent: 50 },
        { min_hours: 0, percent: 0 },
      ],
    },
    'D-01 default sementara: refund berjenjang.',
  ],
  [
    SETTINGS_KEY.CANCELLATION_POLICY_TEXT,
    'Pembatalan lebih dari 48 jam mendapat refund 100% dikurangi biaya gateway; 24–48 jam mendapat refund 50%; kurang dari 24 jam tidak mendapat refund.',
    'D-01 default sementara untuk tampilan checkout.',
  ],
  [SETTINGS_KEY.TAX_RATE, 0, 'D-06 default sementara: harga termasuk pajak.'],
  [
    SETTINGS_KEY.REFUND_API_SUPPORTED_METHODS,
    ['qris', 'gopay', 'shopeepay', 'bank_transfer_va', 'credit_card'],
    'Metode yang mendukung refund gateway.',
  ],
  [SETTINGS_KEY.EVENT_WAITLIST_PAYMENT_WINDOW_MINUTES, 60, 'Batas bayar peserta waitlist event.'],
  [SETTINGS_KEY.CAFE_INVOICE_AUTO_ISSUE, true, 'Terbitkan invoice cafe otomatis.'],
  [SETTINGS_KEY.STAFF_EXPENSE_LIMIT_AMOUNT, 500_000, 'Batas kas kecil staff.'],
  [
    SETTINGS_KEY.EXPENSE_RECEIPT_REQUIRED_ABOVE_AMOUNT,
    100_000,
    'Batas nominal wajib bukti pengeluaran.',
  ],
  [SETTINGS_KEY.FINANCE_LOCKED_UNTIL_DATE, null, 'Belum ada periode keuangan terkunci.'],
  [SETTINGS_KEY.QUIET_HOURS_START, '22:00', 'Mulai quiet hours notifikasi.'],
  [SETTINGS_KEY.QUIET_HOURS_END, '07:00', 'Akhir quiet hours notifikasi.'],
  [SETTINGS_KEY.MIN_SUPPORTED_MOBILE_VERSION, '1.0.0', 'Versi mobile minimum.'],
] as const

const authTemplates = [
  [
    TEMPLATE_CODE.AUTH_EMAIL_VERIFY,
    'Verifikasi email Hola',
    'Halo {{full_name}}, verifikasi email Anda: {{url}}',
    ['full_name', 'url'],
  ],
  [
    TEMPLATE_CODE.AUTH_PASSWORD_RESET,
    'Reset password Hola',
    'Halo {{full_name}}, reset password Anda: {{url}}',
    ['full_name', 'url'],
  ],
  [
    TEMPLATE_CODE.AUTH_PASSWORD_CHANGED,
    'Password Hola berubah',
    'Halo {{full_name}}, password Anda telah berhasil diubah.',
    ['full_name'],
  ],
  [
    TEMPLATE_CODE.AUTH_ACCOUNT_LOCKED,
    'Akun Hola terkunci',
    'Halo {{full_name}}, akun Anda terkunci sementara setelah terlalu banyak percobaan login.',
    ['full_name'],
  ],
] as const

const { db, sql: connection } = createDb({ url: databaseUrl, onlyOneConnection: true })

try {
  const passwordHash = await hash(passwordWithPepper(seedPassword), argon2Options)

  await db.transaction(async (tx) => {
    await tx
      .insert(venues)
      .values({
        id: ids.venue,
        name: 'Hola Balikpapan',
        city: 'Balikpapan',
        timezone: 'Asia/Makassar',
        defaultOpensTime: '06:00',
        defaultClosesTime: '23:00',
        createdAt: seedTime,
        updatedAt: seedTime,
      })
      .onConflictDoNothing()

    await tx
      .insert(sports)
      .values([
        {
          id: ids.padel,
          code: 'padel',
          name: 'Padel',
          sortOrder: 1,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: ids.futsal,
          code: 'futsal',
          name: 'Futsal',
          sortOrder: 2,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: ids.badminton,
          code: 'badminton',
          name: 'Badminton',
          sortOrder: 3,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(courts)
      .values(
        seedCourts.map((court, index) => ({
          ...court,
          venueId: ids.venue,
          slotDurationMinutes: 60,
          minSlotsPerBooking: 1,
          maxSlotsPerBooking: 4,
          maxPlayers: court.sportId === ids.futsal ? 10 : 4,
          sortOrder: index + 1,
          createdAt: seedTime,
          updatedAt: seedTime,
        })),
      )
      .onConflictDoNothing()

    await tx
      .insert(courtOperatingHours)
      .values(
        seedCourts.flatMap((court) =>
          Array.from({ length: 7 }, (_, dayOfWeek) => ({
            id: courtId(300 + (Number(court.id.slice(-3)) - 200) * 10 + dayOfWeek),
            courtId: court.id,
            dayOfWeek,
            opensTime: '06:00',
            closesTime: '23:00',
            createdAt: seedTime,
            updatedAt: seedTime,
          })),
        ),
      )
      .onConflictDoNothing()

    await tx
      .insert(priceRules)
      .values([
        {
          id: courtId(401),
          sportId: ids.padel,
          dayType: 'weekday',
          startsTime: '06:00',
          endsTime: '16:00',
          rateClass: 'offpeak',
          pricePerHourAmount: 150_000,
          priority: 10,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: courtId(402),
          sportId: ids.padel,
          dayType: 'weekday',
          startsTime: '16:00',
          endsTime: '23:00',
          rateClass: 'peak',
          pricePerHourAmount: 250_000,
          priority: 10,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: courtId(403),
          sportId: ids.padel,
          dayType: 'weekend',
          startsTime: '06:00',
          endsTime: '16:00',
          rateClass: 'offpeak',
          pricePerHourAmount: 150_000,
          priority: 10,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: courtId(404),
          sportId: ids.padel,
          dayType: 'weekend',
          startsTime: '16:00',
          endsTime: '23:00',
          rateClass: 'peak',
          pricePerHourAmount: 300_000,
          priority: 10,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(addons)
      .values([
        {
          id: courtId(501),
          code: 'racket_rental',
          name: 'Sewa Raket',
          priceAmount: 30_000,
          unit: 'per_item',
          sortOrder: 1,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: courtId(502),
          code: 'padel_balls',
          name: 'Bola Padel',
          priceAmount: 20_000,
          unit: 'per_item',
          sortOrder: 2,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: courtId(503),
          code: 'towel_rental',
          name: 'Sewa Handuk',
          priceAmount: 10_000,
          unit: 'per_item',
          sortOrder: 3,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(users)
      .values([
        {
          id: ids.admin,
          role: USER_ROLE.ADMIN,
          email: 'admin@hola.test',
          passwordHash,
          fullName: 'Admin Hola',
          emailVerifiedAt: seedTime,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: ids.staff,
          role: USER_ROLE.STAFF,
          email: 'staff@hola.test',
          passwordHash,
          fullName: 'Staff Hola',
          emailVerifiedAt: seedTime,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: ids.tenant,
          role: USER_ROLE.TENANT,
          email: 'tenant@hola.test',
          passwordHash,
          fullName: 'Tenant Hola',
          emailVerifiedAt: seedTime,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: ids.customerOne,
          role: USER_ROLE.CUSTOMER,
          email: 'customer1@hola.test',
          passwordHash,
          fullName: 'Customer Satu',
          emailVerifiedAt: seedTime,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: ids.customerTwo,
          role: USER_ROLE.CUSTOMER,
          email: 'customer2@hola.test',
          passwordHash,
          fullName: 'Customer Dua',
          emailVerifiedAt: seedTime,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
        {
          id: ids.customerThree,
          role: USER_ROLE.CUSTOMER,
          email: 'customer3@hola.test',
          passwordHash,
          fullName: 'Customer Tiga',
          emailVerifiedAt: seedTime,
          createdAt: seedTime,
          updatedAt: seedTime,
        },
      ])
      .onConflictDoNothing()

    await tx
      .insert(appSettings)
      .values(
        defaultSettings.map(([key, value, description]) => ({
          key,
          // `jsonb NOT NULL` menyimpan default `finance_locked_until_date` sebagai
          // JSON `null`, bukan SQL NULL yang melanggar constraint.
          value: value === null ? sql`'null'::jsonb` : value,
          description,
          updatedAt: seedTime,
        })),
      )
      .onConflictDoNothing()

    await tx
      .insert(notificationTemplates)
      .values(
        authTemplates.map(([code, subjectTemplate, bodyTemplate, variables]) => ({
          code,
          channel: NOTIFICATION_CHANNEL.EMAIL,
          subjectTemplate,
          bodyTemplate,
          variables: [...variables],
          isTransactional: true,
          isActive: true,
          createdAt: seedTime,
          updatedAt: seedTime,
        })),
      )
      .onConflictDoNothing()
  })

  console.log('seed Phase 0 selesai: venue, 3 sport, 7 court, 6 user, setting, dan template auth.')
} finally {
  await connection.end()
}
