'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Listens for server-side session invalidation (e.g. admin ban) and
 * redirects the user out of the dashboard immediately when their session
 * is killed, without waiting for a page refresh.
 */
export default function AuthGuard() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return null
}
