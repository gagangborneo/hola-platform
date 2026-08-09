import { useSyncExternalStore } from 'react'
import { type AuthSnapshot, createMemoryAuthStore } from './auth-store.ts'
import { env } from './env.ts'

export {
  type AuthenticatedUser,
  type AuthSessionData,
  type AuthSnapshot,
  createMemoryAuthStore,
  type MemoryAuthStore,
  parseAuthSession,
} from './auth-store.ts'

export const authStore = createMemoryAuthStore({
  apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
  fetch: globalThis.fetch,
})

export function useAuthSession(): AuthSnapshot {
  return useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot,
  )
}
