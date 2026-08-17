'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeStatus } from '@/lib/realtime/RealtimeStatusContext'

export interface AdminPendingCounts {
  total: number
  pendingPosts: number
  pendingUsers: number
  unresolvedReports: number
  pendingNameChanges: number
}

const DEFAULT_COUNTS: AdminPendingCounts = {
  total: 0,
  pendingPosts: 0,
  pendingUsers: 0,
  unresolvedReports: 0,
  pendingNameChanges: 0,
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
  const { reportStatus } = useRealtimeStatus()
  const mountedRef = useRef(true)
  const channelNameRef = useRef(`admin-pending-count-${Math.random().toString(36).slice(2)}`)

  const fetchCounts = useCallback(async () => {
    const [postsResult, vrResult, reportsResult, nameChangeResult] = await Promise.all([
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
      supabase
        .from('name_change_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])

    if (!mountedRef.current) return

    const pendingPosts = postsResult.count ?? 0
    const pendingUsers = vrResult.count ?? 0
    const unresolvedReports = reportsResult.count ?? 0
    const pendingNameChanges = nameChangeResult.count ?? 0

    setCounts({
      pendingPosts,
      pendingUsers,
      unresolvedReports,
      pendingNameChanges,
      total: pendingPosts + pendingUsers + unresolvedReports + pendingNameChanges,
    })
  // supabase is stable — created once per component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!enabled) return
    mountedRef.current = true

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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'name_change_requests' }, () => {
          void fetchCounts()
        })
        .subscribe((status) => {
          reportStatus(channelNameRef.current, status)
        })
    }

    void setup()

    return () => {
      mountedRef.current = false
      window.removeEventListener('admin-count-changed', handleAdminAction)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [enabled, fetchCounts])

  // Poll every 15s regardless of realtime status.
  // postgres_changes events on admin tables are silently dropped when RLS
  // policies use cross-table joins (EXISTS ... FROM profiles), so realtime
  // alone is unreliable here. Polling ensures counts stay fresh.
  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => void fetchCounts(), 15_000)
    return () => clearInterval(id)
  }, [enabled, fetchCounts])

  return counts
}
