/**
 * Dependensi proses yang dibagikan ke service melalui Hono context.
 *
 * Service tetap menerima dependensi sebagai parameter pertama (BR-SV-10);
 * route tidak perlu mengimpor koneksi database/Redis secara langsung
 * (BR-SV-02).
 */
import type { HolaDb } from '@hola/db'
import type { MiddlewareHandler } from 'hono'
import type { Redis } from 'ioredis'
import { db } from '../config/db.ts'
import { type Logger, logger } from '../config/logger.ts'
import { redis } from '../config/redis.ts'
import { type Env, env } from '../env.ts'

export interface CoreDependencies {
  db: HolaDb
  redis: Redis
  logger: Logger
  env: Env
}

export interface CoreDependencyVariables {
  core: CoreDependencies
}

const core: CoreDependencies = { db, redis, logger, env }

export const coreDependencies: MiddlewareHandler<{
  Variables: CoreDependencyVariables
}> = async (c, next) => {
  c.set('core', core)
  await next()
}
