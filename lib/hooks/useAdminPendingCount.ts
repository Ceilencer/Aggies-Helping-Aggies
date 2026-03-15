'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Dispatch this event anywhere in the app to immediately trigger a badge re-fetch.
// Use after admin actions (approve, deny, remove) so the badge updates instantly.
export function notifyAdminCountChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('admin-count-changed'))
  }
}

export function useAdminPendingCount(): number {
  const [count, setCount] = useState(0)
  const supabase = createClient()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const fetchCounts = async () => {
      const [postsResult, profilesResult, reportsResult] = await Promise.all([
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .in('approval_status', ['pending', 'pending_edit']),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_status', 'pending_approval'),
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('is_resolved', false),
      ])

      if (!mountedRef.current) return

      setCount(
        (postsResult.count ?? 0) +
        (profilesResult.count ?? 0) +
        (reportsResult.count ?? 0)
      )
    }

    void fetchCounts()

    // Re-fetch whenever an admin action fires this event
    const handleAdminAction = () => void fetchCounts()
    window.addEventListener('admin-count-changed', handleAdminAction)

    // Realtime subscription for external changes (new post submissions, new signups, new reports)
    const channel = supabase
      .channel('admin-pending-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        void fetchCounts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void fetchCounts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        void fetchCounts()
      })
      .subscribe()

    return () => {
      mountedRef.current = false
      window.removeEventListener('admin-count-changed', handleAdminAction)
      void supabase.removeChannel(channel)
    }
  }, [])

  return count
}
