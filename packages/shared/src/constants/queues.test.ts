/**
 * Test drift: queue & job ≡ docs/02-INFRASTRUCTURE.md § 5.
 *
 * DOC_QUEUES dan DOC_JOBS adalah SALINAN VERBATIM kolom tabel dokumen.
 */
import { describe, expect, it } from 'vitest'
import { JOB, JOB_QUEUE, QUEUE, QUEUE_CONCURRENCY } from './queues'

const DOC_QUEUES = `
booking 5
payment 5
commerce 5
gamification 3
notification 10
system 2
`

const DOC_JOBS = `
J-01 booking.releaseExpiredHolds booking
J-02 booking.autoCompleteBookings booking
J-03 booking.sendBookingReminder booking
J-04 booking.markNoShow booking
J-05 payment.processWebhook payment
J-06 payment.reconcilePending payment
J-07 payment.expireUnpaid payment
J-08 payment.processRefund payment
J-09 commerce.releaseExpiredPromoReservations commerce
J-10 commerce.generateMonthlyInvoices commerce
J-11 commerce.markOverdueInvoices commerce
J-12 commerce.sendInvoiceReminder commerce
J-13 commerce.flagExpiringContracts commerce
J-14 commerce.closeEventRegistration commerce
J-15 commerce.promoteEventWaitlist commerce
J-16 commerce.finalizeEvent commerce
J-17 commerce.generateBracket commerce
J-18 commerce.recomputeStandings commerce
J-19 gamification.awardPoints gamification
J-20 gamification.reversePoints gamification
J-21 gamification.snapshotLeaderboard gamification
J-22 gamification.rebuildLeaderboard gamification
J-23 gamification.closeLeaderboardPeriod gamification
J-24 gamification.recalculateTiers gamification
J-25 notification.sendEmail notification
J-26 notification.sendPush notification
J-27 notification.sendWhatsapp notification
J-28 system.postJournalEntries system
J-29 system.buildDailySummary system
J-30 system.backupDatabase system
J-31 system.cleanupExpiredTokens system
J-32 system.cleanupOrphanUploads system
J-33 system.pruneAuditLogs system
J-34 system.reindexActivityVerification system
J-35 commerce.sweepEventStates commerce
J-36 notification.retryStuckNotifications notification
J-37 system.markMissingAttendance system
`

const docQueues = DOC_QUEUES.trim()
  .split('\n')
  .map((line) => {
    const [name, concurrency] = line.trim().split(' ')
    if (name === undefined || concurrency === undefined) {
      throw new Error(`Baris DOC_QUEUES tidak dapat diurai: ${line}`)
    }
    return { name, concurrency: Number(concurrency) }
  })

const docJobs = DOC_JOBS.trim()
  .split('\n')
  .map((line) => {
    const [id, name, queue] = line.trim().split(' ')
    if (id === undefined || name === undefined || queue === undefined) {
      throw new Error(`Baris DOC_JOBS tidak dapat diurai: ${line}`)
    }
    return { id, name, queue }
  })

describe('queues ≡ docs/02-INFRASTRUCTURE.md § 5', () => {
  it('tepat 6 queue (§ 5.1)', () => {
    expect(Object.values(QUEUE)).toEqual(docQueues.map((q) => q.name))
  })

  it('tepat 37 job (§ 5.3: "Total job resmi v1: J-01 … J-37")', () => {
    expect(Object.values(JOB)).toHaveLength(37)
    expect(Object.values(JOB)).toEqual(docJobs.map((j) => j.name))
  })

  it('nomor J-01..J-37 lengkap tanpa lompatan', () => {
    const nums = docJobs.map((j) => Number(j.id.slice(2))).sort((a, b) => a - b)
    expect(nums).toEqual(Array.from({ length: 37 }, (_, i) => i + 1))
  })

  it.each(docQueues)('queue $name concurrency $concurrency', ({ name, concurrency }) => {
    expect(QUEUE_CONCURRENCY[name as keyof typeof QUEUE_CONCURRENCY]).toBe(concurrency)
  })

  describe.each(docJobs)('$id $name', ({ name, queue }) => {
    it(`berjalan di queue ${queue}`, () => {
      expect(JOB_QUEUE[name as keyof typeof JOB_QUEUE]).toBe(queue)
    })
  })
})
