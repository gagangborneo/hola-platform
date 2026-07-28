/** Helper kebijakan ownership yang dipakai service modul berikutnya. */

import { err } from '../../lib/errors.ts'
import type { Viewer } from './auth.types.ts'

/**
 * Customer tidak boleh mengetahui resource itu ada. Staff/admin boleh menerima
 * 403 saat resource ada tetapi di luar scope mereka.
 */
export function assertOwnedResource<T>(resource: T | null, viewer: Viewer): T {
  if (resource !== null) return resource
  if (viewer.role === 'customer') throw err.notFound()
  throw err.forbidden()
}

/** Query repository wajib menerima owner ID dan menaruhnya di WHERE, bukan JS. */
export interface OwnedRepositoryPattern<T> {
  findByIdForUser: (id: string, userId: string) => Promise<T | null>
  findByIdAdmin: (id: string) => Promise<T | null>
}
