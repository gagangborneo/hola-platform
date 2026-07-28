/**
 * `GET /config/public`.
 * Sumber kebenaran: docs/04-API-CONTRACT.md § 9.2.
 *
 * Kenapa ada: `MIDTRANS_CLIENT_KEY` diambil client saat runtime dari sini,
 * BUKAN dari env frontend (docs/02 § 8.2). Dengan begitu rotasi key tidak
 * memerlukan rebuild & redeploy web/admin/mobile.
 *
 * `server_time` juga penting: hitung mundur hold slot di client WAJIB berbasis
 * waktu server, bukan jam perangkat (docs/06 E-23) — jam perangkat yang meleset
 * membuat customer melihat hold-nya "masih 3 menit" padahal sudah lepas.
 */

import { RATE_LIMIT_BUCKET } from '@hola/shared'
import { Hono } from 'hono'
import { ok } from '../../lib/response.ts'
import type { CoreDependencyVariables } from '../../middleware/core-dependencies.ts'
import type { AuthVariables } from '../../middleware/logger.ts'
import { rateLimit } from '../../middleware/rate-limit.ts'
import type { RequestVariables } from '../../middleware/request-id.ts'
import { getPublicConfig } from './public-config.service.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables

export const configRoutes = new Hono<{ Variables: Variables }>()
  .use('/config/public', rateLimit(RATE_LIMIT_BUCKET.DEFAULT_READ))
  .get('/config/public', async (c) => {
    const core = c.get('core')
    const data = await getPublicConfig({ db: core.db, env: core.env, now: c.get('now') })
    return c.json(ok(data))
  })
