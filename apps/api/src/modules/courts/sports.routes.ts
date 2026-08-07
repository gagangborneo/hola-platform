/** Route publik baca daftar olahraga. */
import { Hono } from 'hono'
import { okList } from '../../lib/response.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { serializeSport } from './courts.serializer.ts'
import { listActiveSports } from './sports.repository.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables

export const sportsRoutes = new Hono<{ Variables: Variables }>().get('/sports', async (c) => {
  const rows = await listActiveSports(c.get('core').db)
  return c.json(okList(rows.map(serializeSport), {}))
})
