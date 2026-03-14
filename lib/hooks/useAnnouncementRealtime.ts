'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChannelAnnouncement } from '@/lib/types'

interface UseAnnouncementRealtimeArgs {
  homeChannelId: string | undefined
  trackedChannelIds: string[]
  profileId: string | undefined
  onHomeAnnouncementChange: (a: ChannelAnnouncement | null) => void
  onChannelAnnouncementChange: (channelId: string, a: ChannelAnnouncement | null) => void
  onNewHomeAnnouncement: (a: ChannelAnnouncement) => void
}

export function useAnnouncementRealtime({
  homeChannelId,
  trackedChannelIds,
  profileId,
  onHomeAnnouncementChange,
  onChannelAnnouncementChange,
  onNewHomeAnnouncement,
}: UseAnnouncementRealtimeArgs) {
  const supabase = createClient()

  useEffect(() => {
    const subscription = supabase
      .channel('announcement-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_announcements' },
        async (payload) => {
          const channelId =
            (payload.new as Record<string, string> | undefined)?.channel_id ??
            (payload.old as Record<string, string> | undefined)?.channel_id
          if (!channelId) return

          const isHome = channelId === homeChannelId
          if (!isHome && !trackedChannelIds.includes(channelId)) return

          if (payload.eventType === 'DELETE') {
            if (isHome) onHomeAnnouncementChange(null)
            else onChannelAnnouncementChange(channelId, null)
            return
          }

          // Fetch full row with profile join — Realtime payloads don't include joined data
          const { data } = await supabase
            .from('channel_announcements')
            .select(`
              id,
              channel_id,
              title,
              content,
              expires_at,
              updated_by,
              created_at,
              updated_at,
              updated_by_profile:profiles!channel_announcements_updated_by_fkey(id, full_name, avatar_url, role)
            `)
            .eq('id', (payload.new as { id: string }).id)
            .maybeSingle()

          if (!data) return
          if (data.expires_at && new Date(data.expires_at) < new Date()) return

          const normalized: ChannelAnnouncement = {
            ...data,
            updated_by_profile: Array.isArray(data.updated_by_profile)
              ? data.updated_by_profile[0] ?? null
              : (data.updated_by_profile as ChannelAnnouncement['updated_by_profile']) ?? null,
          }

          if (isHome) {
            // Pre-mark as seen so the modal popup is suppressed — toast handles the notification
            if (profileId && data.updated_at) {
              localStorage.setItem(`home-announcement-seen-${profileId}`, data.updated_at)
            }
            onHomeAnnouncementChange(normalized)
            onNewHomeAnnouncement(normalized)
          } else {
            onChannelAnnouncementChange(channelId, normalized)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(subscription)
    }
  // trackedChannelIds is an array — join to a stable string for the dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeChannelId, profileId, trackedChannelIds.join(',')])
}
