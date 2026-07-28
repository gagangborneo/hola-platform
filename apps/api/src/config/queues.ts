/** Producer enam queue BullMQ. Worker dibuat eksklusif di worker.ts. */
import { JOB_QUEUE, type JobName, QUEUE, type QueueName } from '@hola/shared'
import { type JobsOptions, Queue } from 'bullmq'
import { env } from '../env.ts'
import { JOB_OPTIONS } from '../jobs/job-options.ts'
import { logger } from './logger.ts'
import { bullRedis } from './redis.ts'

export type JobPayload = Record<string, string | number | boolean | null>
// BullMQ memakai generic `NameType` juga untuk scheduler ID. Karena scheduler
// ID bukan nama job (mis. `scheduler:system.cleanupExpiredTokens`), gunakan
// string di boundary library; `enqueueJobTo` tetap menerima JobName kanonik.
export type ProducerQueue = Queue<JobPayload, void, string>
export type QueueProducers = Record<QueueName, ProducerQueue>

const prefix = `hola:${env.APP_ENV}:bull`

function createQueue(name: QueueName): ProducerQueue {
  const queue = new Queue<JobPayload, void, string>(name, { connection: bullRedis, prefix })
  queue.on('error', (error) => logger.warn({ err: error, queue: name }, 'bullmq producer error'))
  return queue
}

/** Keenam producer dibagi lewat CoreDependencies, tidak pernah dibuat di route. */
export const queues: QueueProducers = {
  [QUEUE.BOOKING]: createQueue(QUEUE.BOOKING),
  [QUEUE.PAYMENT]: createQueue(QUEUE.PAYMENT),
  [QUEUE.COMMERCE]: createQueue(QUEUE.COMMERCE),
  [QUEUE.GAMIFICATION]: createQueue(QUEUE.GAMIFICATION),
  [QUEUE.NOTIFICATION]: createQueue(QUEUE.NOTIFICATION),
  [QUEUE.SYSTEM]: createQueue(QUEUE.SYSTEM),
}

/** Enqueue selalu memakai queue dan opsi kanonik dari konstanta bersama. */
export async function enqueueJobTo(
  producers: QueueProducers,
  name: JobName,
  data: JobPayload,
  options: JobsOptions = {},
): Promise<void> {
  const queue = producers[JOB_QUEUE[name]]
  await queue.add(name, data, { ...JOB_OPTIONS[name], ...options })
}

export async function enqueueJob(
  name: JobName,
  data: JobPayload,
  options: JobsOptions = {},
): Promise<void> {
  await enqueueJobTo(queues, name, data, options)
}

export async function closeQueues(): Promise<void> {
  await Promise.allSettled(Object.values(queues).map(async (queue) => queue.close()))
}

/** Prefix dipakai juga oleh worker dan dashboard; diekspor agar tidak drift. */
export const BULLMQ_PREFIX = prefix
