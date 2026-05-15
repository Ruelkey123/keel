'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  tables: string[]
  onchange: () => void
}

export function useRealtime({ tables, onchange }: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('keel-realtime')

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          onchange()
        }
      )
    }

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
    // onchange is intentionally excluded to avoid infinite loops from inline callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(',')])

  return channelRef.current
}
