import { createHolaClient, type HolaClient } from '@hola/api-client'
import { authStore } from './auth.ts'
import { env } from './env.ts'

/** Satu client HTTP typed; bearer token dibaca dari store in-memory S-5. */
export const apiClient: HolaClient = createHolaClient({
  baseUrl: env.NEXT_PUBLIC_API_BASE_URL,
  getAccessToken: authStore.getAccessToken,
  onUnauthorized: async (): Promise<void> => authStore.clearAccessToken(),
})
