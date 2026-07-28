import { JOB, QUEUE } from '@hola/shared'
import { describe, expect, it } from 'vitest'
import { JOB_OPTIONS } from '../jobs/job-options.ts'
import { queues } from './queues.ts'

describe('producer queue', () => {
  it('F0-57: keenam producer dibangun sekali dengan opsi retry J-25 kanonik', () => {
    expect(Object.keys(queues).sort()).toEqual(Object.values(QUEUE).sort())
    expect(JOB_OPTIONS[JOB.NOTIFICATION_SEND_EMAIL]).toMatchObject({
      attempts: 5,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    })
  })
})
