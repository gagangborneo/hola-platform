/** Opsi BullMQ kanonik per job. Sumber: docs/02 § 5.2 dan § 5.4. */
import { JOB, type JobName } from '@hola/shared'
import type { JobsOptions } from 'bullmq'

const RETENTION = {
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
} as const

function fixed(attempts: number, delay: number): JobsOptions {
  return { ...RETENTION, attempts, backoff: { type: 'fixed', delay } }
}

function exponential(attempts: number, delay: number): JobsOptions {
  return { ...RETENTION, attempts, backoff: { type: 'exponential', delay } }
}

/** Tidak ada retry otomatis untuk J-17 — admin memicu ulang secara sadar. */
const noRetry: JobsOptions = { ...RETENTION, attempts: 1 }

/**
 * Satu sumber opsi retry. Producer dan scheduler menggunakan map ini, agar
 * retry tidak berubah diam-diam antar pemanggil (BR-BQ-12/13).
 */
export const JOB_OPTIONS: Record<JobName, JobsOptions> = {
  [JOB.BOOKING_RELEASE_EXPIRED_HOLDS]: fixed(3, 10_000),
  [JOB.BOOKING_AUTO_COMPLETE_BOOKINGS]: fixed(3, 30_000),
  [JOB.BOOKING_SEND_BOOKING_REMINDER]: exponential(3, 60_000),
  [JOB.BOOKING_MARK_NO_SHOW]: fixed(3, 30_000),
  [JOB.PAYMENT_PROCESS_WEBHOOK]: exponential(5, 5_000),
  [JOB.PAYMENT_RECONCILE_PENDING]: fixed(3, 60_000),
  [JOB.PAYMENT_EXPIRE_UNPAID]: exponential(5, 30_000),
  [JOB.PAYMENT_PROCESS_REFUND]: exponential(5, 60_000),
  [JOB.COMMERCE_RELEASE_EXPIRED_PROMO_RESERVATIONS]: fixed(3, 10_000),
  [JOB.COMMERCE_GENERATE_MONTHLY_INVOICES]: exponential(3, 300_000),
  [JOB.COMMERCE_MARK_OVERDUE_INVOICES]: fixed(3, 60_000),
  [JOB.COMMERCE_SEND_INVOICE_REMINDER]: fixed(3, 60_000),
  [JOB.COMMERCE_FLAG_EXPIRING_CONTRACTS]: fixed(3, 60_000),
  [JOB.COMMERCE_CLOSE_EVENT_REGISTRATION]: fixed(3, 30_000),
  [JOB.COMMERCE_PROMOTE_EVENT_WAITLIST]: exponential(3, 15_000),
  [JOB.COMMERCE_FINALIZE_EVENT]: fixed(3, 60_000),
  [JOB.COMMERCE_GENERATE_BRACKET]: noRetry,
  [JOB.COMMERCE_RECOMPUTE_STANDINGS]: exponential(5, 10_000),
  [JOB.GAMIFICATION_AWARD_POINTS]: exponential(5, 15_000),
  [JOB.GAMIFICATION_REVERSE_POINTS]: exponential(5, 15_000),
  [JOB.GAMIFICATION_SNAPSHOT_LEADERBOARD]: fixed(3, 120_000),
  [JOB.GAMIFICATION_REBUILD_LEADERBOARD]: fixed(3, 60_000),
  [JOB.GAMIFICATION_CLOSE_LEADERBOARD_PERIOD]: fixed(3, 300_000),
  [JOB.GAMIFICATION_RECALCULATE_TIERS]: fixed(3, 60_000),
  [JOB.NOTIFICATION_SEND_EMAIL]: exponential(5, 30_000),
  [JOB.NOTIFICATION_SEND_PUSH]: exponential(3, 15_000),
  [JOB.NOTIFICATION_SEND_WHATSAPP]: exponential(5, 60_000),
  [JOB.SYSTEM_POST_JOURNAL_ENTRIES]: exponential(5, 60_000),
  [JOB.SYSTEM_BUILD_DAILY_SUMMARY]: fixed(3, 300_000),
  [JOB.SYSTEM_BACKUP_DATABASE]: fixed(2, 900_000),
  [JOB.SYSTEM_CLEANUP_EXPIRED_TOKENS]: fixed(3, 60_000),
  [JOB.SYSTEM_CLEANUP_ORPHAN_UPLOADS]: fixed(3, 300_000),
  [JOB.SYSTEM_PRUNE_AUDIT_LOGS]: fixed(3, 300_000),
  [JOB.SYSTEM_REINDEX_ACTIVITY_VERIFICATION]: fixed(3, 60_000),
  [JOB.COMMERCE_SWEEP_EVENT_STATES]: fixed(3, 60_000),
  [JOB.NOTIFICATION_RETRY_STUCK_NOTIFICATIONS]: fixed(3, 60_000),
  [JOB.SYSTEM_MARK_MISSING_ATTENDANCE]: fixed(3, 120_000),
}
