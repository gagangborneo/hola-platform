/** Endpoint publik grid ketersediaan satu court. */
import { RATE_LIMIT_BUCKET } from '@hola/shared'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HEADER, ok } from '../../lib/response.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import { rateLimit } from '../../middleware/rate-limit.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { availabilityCourtParam, availabilityQuery } from './availability.schema.ts'
import { getCourtAvailability } from './availability.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables

function validationHook(result: { success: boolean; error?: unknown }): void {
  if (!result.success) throw result.error
}

export const availabilityRoutes = new Hono<{ Variables: Variables }>()
  .use('/courts/:court_id/availability', rateLimit(RATE_LIMIT_BUCKET.AVAILABILITY_READ))
  .get(
    '/courts/:court_id/availability',
    zValidator('param', availabilityCourtParam, validationHook),
    zValidator('query', availabilityQuery, validationHook),
    async (c) => {
      const core = c.get('core')
      const params = c.req.valid('param')
      const query = c.req.valid('query')
      const result = await getCourtAvailability(
        { ...core, now: c.get('now') },
        { courtId: params.court_id, date: query.date },
      )
      c.header(HEADER.CACHE, result.cache)
      return c.json(
        ok(result.data, { generated_at: result.generatedAt, warnings: result.warnings }),
      )
    },
  )
