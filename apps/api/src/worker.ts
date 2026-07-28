/** Entry point worker BullMQ; proses HTTP tidak pernah mengimpor file ini. */
import { JOB, QUEUE, QUEUE_CONCURRENCY, WORKER_HEARTBEAT_TTL_SECONDS } from '@hola/shared'
import { type Job, Worker } from 'bullmq'
import { closeDatabase, db } from './config/db.ts'
import { logger } from './config/logger.ts'
import { mail } from './config/mail.ts'
import { incrementMetric } from './config/metrics.ts'
import { BULLMQ_PREFIX, closeQueues, queues } from './config/queues.ts'
import { bullRedis, closeRedis, keys, redis, safeRedis } from './config/redis.ts'
import { closeSentry } from './config/sentry.ts'
import { env } from './env.ts'
import { JOB_OPTIONS, processRegisteredJob, scheduledJobs } from './jobs/index.ts'
import { recordEmailDeliveryFailure } from './modules/notifications/notification.service.ts'

const workerRuntime = { db, env, logger, mail, queues }

function logJobStart(job: Job<Record<string, unknown>, unknown, string>): number {
  const started = Date.now()
  logger.info({ job_name: job.name, job_id: job.id, attempt: job.attemptsMade + 1 }, 'job dimulai')
  return started
}

async function runJob(job: Job<Record<string, unknown>, unknown, string>): Promise<void> {
  const started = logJobStart(job)
  try {
    await processRegisteredJob({ ...workerRuntime, now: new Date() }, job)
    incrementMetric('bull_jobs_total', {
      queue: job.queueName,
      job: job.name,
      outcome: 'completed',
    })
    logger.info(
      {
        job_name: job.name,
        job_id: job.id,
        attempt: job.attemptsMade + 1,
        duration_ms: Date.now() - started,
        outcome: 'completed',
      },
      'job selesai',
    )
  } catch (error) {
    incrementMetric('bull_jobs_total', { queue: job.queueName, job: job.name, outcome: 'failed' })
    logger.warn(
      {
        err: error,
        job_name: job.name,
        job_id: job.id,
        attempt: job.attemptsMade + 1,
        duration_ms: Date.now() - started,
        outcome: 'failed',
      },
      'job gagal',
    )
    throw error
  }
}

const workers = Object.values(QUEUE).map((queue) => {
  const worker = new Worker<Record<string, unknown>, unknown, string>(queue, runJob, {
    connection: bullRedis,
    prefix: BULLMQ_PREFIX,
    concurrency: QUEUE_CONCURRENCY[queue],
  })
  worker.on('error', (error) => logger.error({ err: error, queue }, 'bullmq worker error'))
  worker.on('failed', (job, error) => {
    if (
      job?.name === JOB.NOTIFICATION_SEND_EMAIL &&
      job.attemptsMade >= (job.opts.attempts ?? 1) &&
      typeof job.data.notificationId === 'string'
    ) {
      void recordEmailDeliveryFailure(
        { ...workerRuntime, now: new Date() },
        job.data.notificationId,
        error,
      )
    }
  })
  return worker
})

async function installSchedulers(): Promise<void> {
  await Promise.all(
    scheduledJobs.map(async (scheduler) => {
      await queues[scheduler.queue].upsertJobScheduler(scheduler.id, scheduler.repeat, {
        name: scheduler.name,
        data: {},
        opts: JOB_OPTIONS[scheduler.name],
      })
    }),
  )
}

async function heartbeat(): Promise<void> {
  await safeRedis(
    'worker_heartbeat',
    () =>
      redis.set(
        keys.workerHeartbeat(),
        new Date().toISOString(),
        'EX',
        WORKER_HEARTBEAT_TTL_SECONDS,
      ),
    null,
  )
}

await installSchedulers()
await heartbeat()
const heartbeatTimer = setInterval(() => void heartbeat(), 30_000)
logger.info({ workers: workers.length }, 'hola-worker siap')

let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  clearInterval(heartbeatTimer)
  logger.info({ signal }, 'worker shutdown dimulai')
  const closeWorkers = Promise.allSettled(workers.map(async (worker) => worker.close()))
  const deadline = new Promise<void>((resolve) => setTimeout(resolve, 30_000))
  await Promise.race([closeWorkers, deadline])
  await Promise.allSettled([closeQueues(), closeDatabase(), closeRedis(), closeSentry()])
  logger.info('worker shutdown selesai')
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
