/** Identitas tampilan saja — dipakai header dan sidebar akun, tidak untuk otorisasi. */
export interface AuthenticatedUser {
  id: string
  role: string
  email: string | null
  phone: string | null
  fullName: string
}

export interface AuthSnapshot {
  accessToken: string | null
  isReady: boolean
  user: AuthenticatedUser | null
}

export interface AuthSessionData {
  accessToken: string
  user: AuthenticatedUser | null
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
  setSession(session: AuthSessionData): void
  subscribe(listener: () => void): () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseUser(value: unknown): AuthenticatedUser | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || typeof value.full_name !== 'string') return null
  return {
    id: value.id,
    role: typeof value.role === 'string' ? value.role : 'customer',
    email: typeof value.email === 'string' ? value.email : null,
    phone: typeof value.phone === 'string' ? value.phone : null,
    fullName: value.full_name,
  }
}

/**
 * `POST /auth/login` dan `POST /auth/refresh` memakai serializer respons yang
 * sama di API, jadi satu parser dipakai keduanya — tanpa itu identitas pengguna
 * hanya hidup sampai reload berikutnya.
 *
 * `user` sengaja opsional: identitas hanya menghias header/sidebar, jadi respons
 * tanpa `user` tetap menghasilkan sesi sah, bukan kegagalan login.
 */
export function parseAuthSession(value: unknown): AuthSessionData | null {
  if (!isRecord(value) || !isRecord(value.data)) return null
  const accessToken = value.data.access_token
  if (typeof accessToken !== 'string' || accessToken.length === 0) return null
  return { accessToken, user: parseUser(value.data.user) }
}

function isSameUser(left: AuthenticatedUser | null, right: AuthenticatedUser | null): boolean {
  if (left === right) return true
  if (!left || !right) return false
  return (
    left.id === right.id &&
    left.role === right.role &&
    left.email === right.email &&
    left.phone === right.phone &&
    left.fullName === right.fullName
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
  // Dipanggil sebagai variabel lokal, bukan `options.fetch(...)` (method call): native
  // `fetch` di browser melempar `TypeError: Illegal invocation` saat `this` bukan
  // `window`/`globalThis` — persis yang terjadi bila dipanggil lewat properti objek.
  const requestFetch = options.fetch
  const listeners = new Set<() => void>()
  const serverSnapshot: AuthSnapshot = { accessToken: null, isReady: false, user: null }
  let snapshot: AuthSnapshot = { accessToken: null, isReady: false, user: null }
  let revision = 0
  let refreshInFlight: Promise<string | null> | undefined

  const publish = (next: AuthSnapshot): void => {
    if (
      snapshot.accessToken === next.accessToken &&
      snapshot.isReady === next.isReady &&
      isSameUser(snapshot.user, next.user)
    )
      return
    snapshot = next
    for (const listener of listeners) listener()
  }

  const setSession = (session: AuthSessionData | null, isReady: boolean): void => {
    revision += 1
    publish({ accessToken: session?.accessToken ?? null, isReady, user: session?.user ?? null })
  }

  const restoreSession = (): Promise<string | null> => {
    if (refreshInFlight) return refreshInFlight
    const requestRevision = revision
    const task = (async (): Promise<string | null> => {
      try {
        const response = await requestFetch(
          `${normalizeApiBaseUrl(options.apiBaseUrl)}/api/v1/auth/refresh`,
          {
            method: 'POST',
            credentials: 'include',
          },
        )
        if (!response.ok) {
          if (requestRevision === revision)
            publish({ accessToken: null, isReady: true, user: null })
          return null
        }

        const body: unknown = await response.json()
        const session = parseAuthSession(body)
        if (!session) {
          if (requestRevision === revision)
            publish({ accessToken: null, isReady: true, user: null })
          return null
        }

        if (requestRevision === revision)
          publish({ accessToken: session.accessToken, isReady: true, user: session.user })
        return session.accessToken
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
    setSession(session: AuthSessionData): void {
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
