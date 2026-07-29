'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { authStore } from '../lib/auth.ts'
import { createQueryClient } from '../lib/query-client.ts'

interface ProvidersProps {
  children: ReactNode
}

/** Provider browser untuk query dan pemulihan cookie refresh satu kali saat reload. */
export function Providers({ children }: ProvidersProps): ReactNode {
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    // S-5: refresh single-flight tetap aman saat React Strict Mode aktif.
    void authStore.restoreSession()
  }, [])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
