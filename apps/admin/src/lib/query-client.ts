import { QueryClient } from '@tanstack/react-query'

/** Satu query client browser dengan retry konservatif untuk kegagalan jaringan sementara. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
  })
}
