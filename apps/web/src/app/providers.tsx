'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { authStore } from '../lib/auth.ts'
import { createQueryClient } from '../lib/query-client.ts'

interface ProvidersProps {
  children: ReactNode
}

/** Provider browser untuk TanStack Query dan pemulihan cookie refresh sekali saat reload. */
export function Providers({ children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    // S-5: single-flight di store mencegah React Strict Mode memakai refresh cookie dua kali.
    void authStore.restoreSession()
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
