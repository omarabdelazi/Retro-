'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

// Subscribes to Realtime changes on the given tables (comma-separated) and
// re-renders the current server component tree. RLS scopes what the admin's
// JWT is allowed to hear. Renders nothing; no polling, no animation.
export function LiveRefresh({ tables }: { tables: string }) {
  const router = useRouter()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return

    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined

    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 250)
    }

    const channel = supabase.channel('admin-live')
    for (const table of tables.split(',')) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table.trim() },
        refresh,
      )
    }
    channel.subscribe()

    return () => {
      clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [router, tables])

  return null
}
