/** Default-deny RBAC guard dan registry boot-time route terlindungi. */
import type { UserRole } from '@hola/shared'
import type { MiddlewareHandler } from 'hono'
import { err } from '../lib/errors.ts'
import type { CoreDependencyVariables } from './core-dependencies.ts'
import type { AuthVariables } from './logger.ts'
import type { RequestVariables } from './request-id.ts'

type Variables = RequestVariables & CoreDependencyVariables & AuthVariables

const guardedRouteKeys = new Set<string>()
const endpointMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

function routeKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`
}

export function requireRole(
  roles: readonly UserRole[],
): MiddlewareHandler<{ Variables: Variables }> {
  return async (c, next) => {
    const role = c.get('role')
    if (!role) throw err.unauthenticated()
    if (!roles.includes(role)) throw err.forbidden()
    // Data `cafe_tenants` menyusul bersama modul tenant. Namun kontrak sudah
    // aman sejak sekarang: akun tenant tanpa tautan tidak boleh mengakses apa pun.
    if (role === 'tenant' && !c.get('cafeTenantId')) {
      throw err.forbidden('Akun tenant belum ditautkan.')
    }
    await next()
  }
}

/** Dipanggil route bersamaan dengan pemasangan authenticate + requireRole. */
export function registerGuardedRoute(method: string, path: string): void {
  guardedRouteKeys.add(routeKey(method, path))
}

interface HonoRoute {
  method: string
  path: string
}

/**
 * Gagal keras pada boot jika endpoint nyata tak punya deklarasi publik maupun
 * guard. Ini menutup kesalahan "route baru lupa auth" sebelum deploy.
 */
export function assertRouteGuards(
  routes: readonly HonoRoute[],
  publicAllowlist: ReadonlySet<string>,
): void {
  const registeredEndpoints = new Set(
    routes
      .filter((route) => endpointMethods.has(route.method.toUpperCase()))
      .map((route) => routeKey(route.method, route.path)),
  )

  for (const endpoint of registeredEndpoints) {
    if (!publicAllowlist.has(endpoint) && !guardedRouteKeys.has(endpoint)) {
      throw new Error(`Route tanpa requireRole atau public allowlist: ${endpoint}`)
    }
  }
  for (const guarded of guardedRouteKeys) {
    if (!registeredEndpoints.has(guarded)) {
      throw new Error(`Route RBAC terdaftar tetapi tidak ditemukan saat boot: ${guarded}`)
    }
  }
}

/** Hanya untuk unit test registry isolasi. */
export function resetGuardedRouteRegistry(): void {
  guardedRouteKeys.clear()
}
