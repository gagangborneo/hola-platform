export interface AuthSnapshot {
  accessToken: string | null
  isReady: boolean
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
  setAccessToken(accessToken: string): void
  subscribe(listener: () => void): () => void
}

interface RefreshPayload {
  data: { access_token: string }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRefreshPayload(value: unknown): value is RefreshPayload {
  return (
    isRecord(value) &&
    isRecord(value.data) &&
    typeof value.data.access_token === 'string' &&
    value.data.access_token.length > 0
  )
}

function normalizeApiBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

/**
 * Store sesi yang sengaja hanya hidup di memori JavaScript (S-5).
 * `restoreSession` single-flight agar React Strict Mode/tabs tidak merotasi cookie ganda.
 */
export function createMemoryAuthStore(options: MemoryAuthStoreOptions): MemoryAuthStore {
  const listeners = new Set<() => void>()
  const serverSnapshot: AuthSnapshot = { accessToken: null, isReady: false }
  let snapshot: AuthSnapshot = { accessToken: null, isReady: false }
  let revision = 0
  let refreshInFlight: Promise<string | null> | undefined

  const publish = (next: AuthSnapshot): void => {
    if (snapshot.accessToken === next.accessToken && snapshot.isReady === next.isReady) return
    snapshot = next
    for (const listener of listeners) listener()
  }

  const setToken = (accessToken: string | null, isReady: boolean): void => {
    revision += 1
    publish({ accessToken, isReady })
  }

  const restoreSession = (): Promise<string | null> => {
    if (refreshInFlight) return refreshInFlight
    const requestRevision = revision
    const task = (async (): Promise<string | null> => {
      try {
        const response = await options.fetch(
          `${normalizeApiBaseUrl(options.apiBaseUrl)}/api/v1/auth/refresh`,
          {
            method: 'POST',
            credentials: 'include',
          },
        )
        if (!response.ok) {
          if (requestRevision === revision) publish({ accessToken: null, isReady: true })
          return null
        }

        const body: unknown = await response.json()
        if (!isRefreshPayload(body)) {
          if (requestRevision === revision) publish({ accessToken: null, isReady: true })
          return null
        }

        if (requestRevision === revision)
          publish({ accessToken: body.data.access_token, isReady: true })
        return body.data.access_token
      } catch {
        if (requestRevision === revision) publish({ accessToken: null, isReady: true })
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
      setToken(null, true)
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
    setAccessToken(accessToken: string): void {
      setToken(accessToken, true)
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return (): void => {
        listeners.delete(listener)
      }
    },
  }
}
