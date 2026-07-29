import { JOB } from '@hola/shared'
import { describe, expect, it } from 'vitest'
import { registeredJobNames, scheduledJobs } from './index.ts'

describe('registry BullMQ', () => {
  it('BR-BQ-03/F0-58: setiap konstanta JOB terdaftar tepat satu kali pada worker', () => {
    expect([...registeredJobNames].sort()).toEqual(Object.values(JOB).sort())
    expect(new Set(registeredJobNames)).toHaveLength(Object.values(JOB).length)
  })

  it('BR-BQ-04/BR-BQ-05: scheduler yang diaktifkan memakai ID stabil dan WITA', () => {
    expect(scheduledJobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'scheduler:system.cleanupExpiredTokens',
          name: JOB.SYSTEM_CLEANUP_EXPIRED_TOKENS,
          repeat: expect.objectContaining({ tz: 'Asia/Makassar' }),
        }),
        expect.objectContaining({
          id: 'scheduler:notification.retryStuckNotifications',
          name: JOB.NOTIFICATION_RETRY_STUCK_NOTIFICATIONS,
          repeat: expect.objectContaining({ tz: 'Asia/Makassar' }),
        }),
        expect.objectContaining({
          id: 'scheduler:system.cleanupOrphanUploads',
          name: JOB.SYSTEM_CLEANUP_ORPHAN_UPLOADS,
          repeat: expect.objectContaining({ pattern: '0 5 * * 0', tz: 'Asia/Makassar' }),
        }),
      ]),
    )
  })
})
