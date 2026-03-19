'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthGuard({ userId }: { userId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Fallback: catches token refresh failures (e.g. after admin.signOut)
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/')
      }
    })

    // Primary: Realtime postgres_changes on this user's profile row.
    // Fires the moment account_status flips to 'suspended' — no refresh needed.
    // Uses the existing websocket connection, so no extra Realtime quota consumed.
    const channel = supabase
      .channel(`auth-guard-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.new.account_status === 'suspended') {
            await supabase.auth.signOut()
            router.replace('/?suspended=true')
          }
        }
      )
      .subscribe()

    return () => {
      authSub.unsubscribe()
      void supabase.removeChannel(channel)
    }
  }, [userId, router])

  return null
}
