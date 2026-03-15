'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AdminPendingCounts {
  total: number
  pendingPosts: number
  pendingUsers: number
  unresolvedReports: number
}

const DEFAULT_COUNTS: AdminPendingCounts = {
  total: 0,
  pendingPosts: 0,
  pendingUsers: 0,
  unresolvedReports: 0,
}

// Dispatch this event anywhere in the app to immediately trigger a badge re-fetch.
// Use after admin actions (approve, deny, remove) so the badge updates instantly.
export function notifyAdminCountChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('admin-count-changed'))
  }
}

export function useAdminPendingCount(enabled = true): AdminPendingCounts {
  const [counts, setCounts] = useState<AdminPendingCounts>(DEFAULT_COUNTS)
  const supabase = createClient()
  const mountedRef = useRef(true)
  const channelNameRef = useRef(`admin-pending-count-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    if (!enabled) return
    mountedRef.current = true

    const fetchCounts = async () => {
      const [postsResult, vrResult, reportsResult] = await Promise.all([
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .in('approval_status', ['pending', 'pending_edit']),
        supabase
          .from('verification_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('is_resolved', false),
      ])

      if (!mountedRef.current) return

      const pendingPosts = postsResult.count ?? 0
      const pendingUsers = vrResult.count ?? 0
      const unresolvedReports = reportsResult.count ?? 0

      setCounts({
        pendingPosts,
        pendingUsers,
        unresolvedReports,
        total: pendingPosts + pendingUsers + unresolvedReports,
      })
    }

    const handleAdminAction = () => void fetchCounts()
    let channel: ReturnType<typeof supabase.channel> | null = null

    // In production (no React StrictMode double-mount), the Supabase browser
    // client may not have loaded its session from cookies yet when the effect
    // first runs. Awaiting getSession() ensures the JWT is ready before we
    // query the DB or establish the realtime channel — both of which require
    // an authenticated connection for RLS to pass.
    const setup = async () => {
      await supabase.auth.getSession()
      if (!mountedRef.current) return

      void fetchCounts()

      window.addEventListener('admin-count-changed', handleAdminAction)

      channel = supabase
        .channel(channelNameRef.current)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          void fetchCounts()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'verification_requests' }, () => {
          void fetchCounts()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
          void fetchCounts()
        })
        .subscribe()
    }

    void setup()

    return () => {
      mountedRef.current = false
      window.removeEventListener('admin-count-changed', handleAdminAction)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [enabled])

  return counts
}
