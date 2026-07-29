/** Tipe runtime bersama untuk seluruh handler job. */
import type { Job } from 'bullmq'
import type { CoreDependencies } from '../middleware/core-dependencies.ts'

export type WorkerRuntime = Pick<
  CoreDependencies,
  'db' | 'env' | 'logger' | 'mail' | 'queues' | 'storage'
> & { now: Date }

export type RegisteredJob = Job<Record<string, unknown>, unknown, string>
export type JobHandler = (ctx: WorkerRuntime, job: RegisteredJob) => Promise<void>
