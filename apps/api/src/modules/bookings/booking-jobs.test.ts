import { QUEUE } from '@hola/shared'
import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../../config/logger.ts'
import type { QueueProducers } from '../../config/queues.ts'
import { replaceBookingJobs } from './booking-jobs.ts'

describe('booking job lifecycle', () => {
  it('BR-B-58/P1-69: replace me-remove jobId lama sebelum memasang jadwal baru', async () => {
    const add = vi.fn(async () => undefined)
    const remove = vi.fn(async () => 1)
    const queues = Object.fromEntries(
      Object.values(QUEUE).map((queue) => [queue, { add, remove }]),
    ) as unknown as QueueProducers
    const logger = { warn: vi.fn() } as unknown as Logger
    const bookingId = '01950000-0000-7000-8000-000000000201'

    await replaceBookingJobs(
      { queues, logger, now: new Date('2026-08-01T10:00:00.000Z') },
      {
        bookingId,
        startsAt: new Date('2026-08-01T14:00:00.000Z'),
        endsAt: new Date('2026-08-01T15:00:00.000Z'),
      },
    )

    expect(remove).toHaveBeenCalledWith(`reminder-${bookingId}`)
    expect(remove).toHaveBeenCalledWith(`noshow-${bookingId}`)
    expect(add).toHaveBeenCalledTimes(2)
    expect(remove.mock.invocationCallOrder[1]).toBeLessThan(add.mock.invocationCallOrder[0] ?? 0)
  })
})
