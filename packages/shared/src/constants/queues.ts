/**
 * Nama queue & job BullMQ.
 *
 * Sumber kebenaran: docs/02-INFRASTRUCTURE.md § 5. Nama job di sini adalah nama
 * KANONIK dari tabel § 5.2/§ 5.3 — modul lain hanya boleh merujuk nama dari
 * tabel itu, dan menambah job berarti menambah barisnya di dokumen lebih dulu
 * (docs/16-CONVENTIONS.md AI-9).
 *
 * Dilarang menulis nama queue/job sebagai string literal (AI-6).
 *
 * Test drift queues.test.ts menjaga file ini identik dengan dokumen; test F0-58
 * nanti membandingkan JOB.* dengan Worker yang benar-benar terdaftar di
 * apps/api/src/jobs/index.ts (BR-BQ-03).
 */

/** Enam queue (docs/02 § 5.1). */
export const QUEUE = {
  BOOKING: 'booking',
  PAYMENT: 'payment',
  COMMERCE: 'commerce',
  GAMIFICATION: 'gamification',
  NOTIFICATION: 'notification',
  SYSTEM: 'system',
} as const

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE]

/** Concurrency worker per queue (docs/02 § 5.1). */
export const QUEUE_CONCURRENCY = {
  [QUEUE.BOOKING]: 5,
  [QUEUE.PAYMENT]: 5,
  [QUEUE.COMMERCE]: 5,
  [QUEUE.GAMIFICATION]: 3,
  [QUEUE.NOTIFICATION]: 10,
  [QUEUE.SYSTEM]: 2,
} as const satisfies Record<QueueName, number>

/** 37 job resmi v1 (docs/02 § 5.2 + § 5.3). */
export const JOB = {
  BOOKING_RELEASE_EXPIRED_HOLDS: 'booking.releaseExpiredHolds', // J-01
  BOOKING_AUTO_COMPLETE_BOOKINGS: 'booking.autoCompleteBookings', // J-02
  BOOKING_SEND_BOOKING_REMINDER: 'booking.sendBookingReminder', // J-03
  BOOKING_MARK_NO_SHOW: 'booking.markNoShow', // J-04
  PAYMENT_PROCESS_WEBHOOK: 'payment.processWebhook', // J-05
  PAYMENT_RECONCILE_PENDING: 'payment.reconcilePending', // J-06
  PAYMENT_EXPIRE_UNPAID: 'payment.expireUnpaid', // J-07
  PAYMENT_PROCESS_REFUND: 'payment.processRefund', // J-08
  COMMERCE_RELEASE_EXPIRED_PROMO_RESERVATIONS: 'commerce.releaseExpiredPromoReservations', // J-09
  COMMERCE_GENERATE_MONTHLY_INVOICES: 'commerce.generateMonthlyInvoices', // J-10
  COMMERCE_MARK_OVERDUE_INVOICES: 'commerce.markOverdueInvoices', // J-11
  COMMERCE_SEND_INVOICE_REMINDER: 'commerce.sendInvoiceReminder', // J-12
  COMMERCE_FLAG_EXPIRING_CONTRACTS: 'commerce.flagExpiringContracts', // J-13
  COMMERCE_CLOSE_EVENT_REGISTRATION: 'commerce.closeEventRegistration', // J-14
  COMMERCE_PROMOTE_EVENT_WAITLIST: 'commerce.promoteEventWaitlist', // J-15
  COMMERCE_FINALIZE_EVENT: 'commerce.finalizeEvent', // J-16
  COMMERCE_GENERATE_BRACKET: 'commerce.generateBracket', // J-17
  COMMERCE_RECOMPUTE_STANDINGS: 'commerce.recomputeStandings', // J-18
  GAMIFICATION_AWARD_POINTS: 'gamification.awardPoints', // J-19
  GAMIFICATION_REVERSE_POINTS: 'gamification.reversePoints', // J-20
  GAMIFICATION_SNAPSHOT_LEADERBOARD: 'gamification.snapshotLeaderboard', // J-21
  GAMIFICATION_REBUILD_LEADERBOARD: 'gamification.rebuildLeaderboard', // J-22
  GAMIFICATION_CLOSE_LEADERBOARD_PERIOD: 'gamification.closeLeaderboardPeriod', // J-23
  GAMIFICATION_RECALCULATE_TIERS: 'gamification.recalculateTiers', // J-24
  NOTIFICATION_SEND_EMAIL: 'notification.sendEmail', // J-25
  NOTIFICATION_SEND_PUSH: 'notification.sendPush', // J-26
  NOTIFICATION_SEND_WHATSAPP: 'notification.sendWhatsapp', // J-27
  SYSTEM_POST_JOURNAL_ENTRIES: 'system.postJournalEntries', // J-28
  SYSTEM_BUILD_DAILY_SUMMARY: 'system.buildDailySummary', // J-29
  SYSTEM_BACKUP_DATABASE: 'system.backupDatabase', // J-30
  SYSTEM_CLEANUP_EXPIRED_TOKENS: 'system.cleanupExpiredTokens', // J-31
  SYSTEM_CLEANUP_ORPHAN_UPLOADS: 'system.cleanupOrphanUploads', // J-32
  SYSTEM_PRUNE_AUDIT_LOGS: 'system.pruneAuditLogs', // J-33
  SYSTEM_REINDEX_ACTIVITY_VERIFICATION: 'system.reindexActivityVerification', // J-34
  COMMERCE_SWEEP_EVENT_STATES: 'commerce.sweepEventStates', // J-35
  NOTIFICATION_RETRY_STUCK_NOTIFICATIONS: 'notification.retryStuckNotifications', // J-36
  SYSTEM_MARK_MISSING_ATTENDANCE: 'system.markMissingAttendance', // J-37
} as const

export type JobName = (typeof JOB)[keyof typeof JOB]

/** Queue tempat setiap job berjalan (docs/02 § 5.2 + § 5.3, kolom "Queue"). */
export const JOB_QUEUE = {
  [JOB.BOOKING_RELEASE_EXPIRED_HOLDS]: QUEUE.BOOKING,
  [JOB.BOOKING_AUTO_COMPLETE_BOOKINGS]: QUEUE.BOOKING,
  [JOB.BOOKING_SEND_BOOKING_REMINDER]: QUEUE.BOOKING,
  [JOB.BOOKING_MARK_NO_SHOW]: QUEUE.BOOKING,
  [JOB.PAYMENT_PROCESS_WEBHOOK]: QUEUE.PAYMENT,
  [JOB.PAYMENT_RECONCILE_PENDING]: QUEUE.PAYMENT,
  [JOB.PAYMENT_EXPIRE_UNPAID]: QUEUE.PAYMENT,
  [JOB.PAYMENT_PROCESS_REFUND]: QUEUE.PAYMENT,
  [JOB.COMMERCE_RELEASE_EXPIRED_PROMO_RESERVATIONS]: QUEUE.COMMERCE,
  [JOB.COMMERCE_GENERATE_MONTHLY_INVOICES]: QUEUE.COMMERCE,
  [JOB.COMMERCE_MARK_OVERDUE_INVOICES]: QUEUE.COMMERCE,
  [JOB.COMMERCE_SEND_INVOICE_REMINDER]: QUEUE.COMMERCE,
  [JOB.COMMERCE_FLAG_EXPIRING_CONTRACTS]: QUEUE.COMMERCE,
  [JOB.COMMERCE_CLOSE_EVENT_REGISTRATION]: QUEUE.COMMERCE,
  [JOB.COMMERCE_PROMOTE_EVENT_WAITLIST]: QUEUE.COMMERCE,
  [JOB.COMMERCE_FINALIZE_EVENT]: QUEUE.COMMERCE,
  [JOB.COMMERCE_GENERATE_BRACKET]: QUEUE.COMMERCE,
  [JOB.COMMERCE_RECOMPUTE_STANDINGS]: QUEUE.COMMERCE,
  [JOB.GAMIFICATION_AWARD_POINTS]: QUEUE.GAMIFICATION,
  [JOB.GAMIFICATION_REVERSE_POINTS]: QUEUE.GAMIFICATION,
  [JOB.GAMIFICATION_SNAPSHOT_LEADERBOARD]: QUEUE.GAMIFICATION,
  [JOB.GAMIFICATION_REBUILD_LEADERBOARD]: QUEUE.GAMIFICATION,
  [JOB.GAMIFICATION_CLOSE_LEADERBOARD_PERIOD]: QUEUE.GAMIFICATION,
  [JOB.GAMIFICATION_RECALCULATE_TIERS]: QUEUE.GAMIFICATION,
  [JOB.NOTIFICATION_SEND_EMAIL]: QUEUE.NOTIFICATION,
  [JOB.NOTIFICATION_SEND_PUSH]: QUEUE.NOTIFICATION,
  [JOB.NOTIFICATION_SEND_WHATSAPP]: QUEUE.NOTIFICATION,
  [JOB.SYSTEM_POST_JOURNAL_ENTRIES]: QUEUE.SYSTEM,
  [JOB.SYSTEM_BUILD_DAILY_SUMMARY]: QUEUE.SYSTEM,
  [JOB.SYSTEM_BACKUP_DATABASE]: QUEUE.SYSTEM,
  [JOB.SYSTEM_CLEANUP_EXPIRED_TOKENS]: QUEUE.SYSTEM,
  [JOB.SYSTEM_CLEANUP_ORPHAN_UPLOADS]: QUEUE.SYSTEM,
  [JOB.SYSTEM_PRUNE_AUDIT_LOGS]: QUEUE.SYSTEM,
  [JOB.SYSTEM_REINDEX_ACTIVITY_VERIFICATION]: QUEUE.SYSTEM,
  [JOB.COMMERCE_SWEEP_EVENT_STATES]: QUEUE.COMMERCE,
  [JOB.NOTIFICATION_RETRY_STUCK_NOTIFICATIONS]: QUEUE.NOTIFICATION,
  [JOB.SYSTEM_MARK_MISSING_ATTENDANCE]: QUEUE.SYSTEM,
} as const satisfies Record<JobName, QueueName>
