'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useRealtime } from '@/hooks/useRealtime'

const TABLES = ['bookings', 'boats']

export function RealTimeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useRealtime({
    tables: TABLES,
    onchange: useMemo(() => () => router.refresh(), [router]),
  })

  return <>{children}</>
}
