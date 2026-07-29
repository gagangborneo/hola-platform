import type { UserRole } from '@hola/shared'

export type AdminRole = Exclude<UserRole, 'customer'>

export interface AuthenticatedAdminUser {
  id: string
  role: AdminRole
  email: string | null
  fullName: string
}

export interface AuthSnapshot {
  accessToken: string | null
  isReady: boolean
  user: AuthenticatedAdminUser | null
}

interface AuthSessionUser {
  id: string
  role: AdminRole
  email: string | null
  full_name: string
}

export interface AuthSessionPayload {
  data: {
    access_token: string
    user: AuthSessionUser
  }
}

export interface MemoryAuthStoreOptions {
  apiBaseUrl: string
  fetch: typeof globalThis.fetch
}

export interface MemoryAuthStore {
  clearAccessToken(): void
  getAccessToken(): string | null
  getServerSnapshot(): AuthSnapshot
  getSnapshot(): AuthSnapshot
  restoreSession(): Promise<string | null>
  setSession(session: AuthSessionPayload['data']): void
  subscribe(listener: () => void): () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAdminRole(value: unknown): value is AdminRole {
  return value === 'admin' || value === 'staff' || value === 'tenant'
}

function isAuthSessionUser(value: unknown): value is AuthSessionUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isAdminRole(value.role) &&
    (typeof value.email === 'string' || value.email === null) &&
    typeof value.full_name === 'string'
  )
}

function normalizeUser(user: AuthSessionPayload['data']['user']): AuthenticatedAdminUser {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    fullName: user.full_name,
  }
}

/** Menolak sesi customer pada shell back-office sebagai guard UX pertama. */
export function isAdminSessionPayload(value: unknown): value is AuthSessionPayload {
  return (
    isRecord(value) &&
    isRecord(value.data) &&
    typeof value.data.access_token === 'string' &&
    value.data.access_token.length > 0 &&
    isAuthSessionUser(value.data.user)
  )
}

function normalizeApiBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

/**
 * Store sesi hanya berada di memori JavaScript (S-5). Cookie refresh dipakai
 * sekali saat reload dan session customer tidak pernah diterima oleh admin UI.
 */
export function createMemoryAuthStore(options: MemoryAuthStoreOptions): MemoryAuthStore {
  const listeners = new Set<() => void>()
  const serverSnapshot: AuthSnapshot = { accessToken: null, isReady: false, user: null }
  let snapshot: AuthSnapshot = { accessToken: null, isReady: false, user: null }
  let revision = 0
  let refreshInFlight: Promise<string | null> | undefined

  const publish = (next: AuthSnapshot): void => {
    if (
      snapshot.accessToken === next.accessToken &&
      snapshot.isReady === next.isReady &&
      snapshot.user === next.user
    )
      return
    snapshot = next
    for (const listener of listeners) listener()
  }

  const setSession = (session: AuthSessionPayload['data'] | null, isReady: boolean): void => {
    revision += 1
    publish({
      accessToken: session?.access_token ?? null,
      isReady,
      user: session ? normalizeUser(session.user) : null,
    })
  }

  const restoreSession = (): Promise<string | null> => {
    if (refreshInFlight) return refreshInFlight
    const requestRevision = revision
    const task = (async (): Promise<string | null> => {
      try {
        const response = await options.fetch(
          `${normalizeApiBaseUrl(options.apiBaseUrl)}/api/v1/auth/refresh`,
          { method: 'POST', credentials: 'include' },
        )
        if (!response.ok) {
          if (requestRevision === revision)
            publish({ accessToken: null, isReady: true, user: null })
          return null
        }

        const body: unknown = await response.json()
        if (!isAdminSessionPayload(body)) {
          if (requestRevision === revision)
            publish({ accessToken: null, isReady: true, user: null })
          return null
        }

        if (requestRevision === revision) {
          publish({
            accessToken: body.data.access_token,
            isReady: true,
            user: normalizeUser(body.data.user),
          })
        }
        return body.data.access_token
      } catch {
        if (requestRevision === revision) publish({ accessToken: null, isReady: true, user: null })
        return null
      }
    })()

    refreshInFlight = task.finally(() => {
      refreshInFlight = undefined
    })
    return refreshInFlight
  }

  return {
    clearAccessToken(): void {
      setSession(null, true)
    },
    getAccessToken(): string | null {
      return snapshot.accessToken
    },
    getServerSnapshot(): AuthSnapshot {
      return serverSnapshot
    },
    getSnapshot(): AuthSnapshot {
      return snapshot
    },
    restoreSession,
    setSession(session: AuthSessionPayload['data']): void {
      setSession(session, true)
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return (): void => {
        listeners.delete(listener)
      }
    },
  }
}
