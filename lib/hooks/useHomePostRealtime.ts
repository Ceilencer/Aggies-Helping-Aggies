'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FeedPost } from '@/lib/types'

interface UseHomePostRealtimeArgs {
  trackedChannelIds: string[]
  onPostUpserted: (post: FeedPost, isInsert: boolean) => void
  onPostDeleted: (postId: string) => void
}

export function useHomePostRealtime({
  trackedChannelIds,
  onPostUpserted,
  onPostDeleted,
}: UseHomePostRealtimeArgs) {
  const supabase = createClient()

  const onPostUpsertedRef = useRef(onPostUpserted)
  onPostUpsertedRef.current = onPostUpserted
  const onPostDeletedRef = useRef(onPostDeleted)
  onPostDeletedRef.current = onPostDeleted


  useEffect(() => {
    if (trackedChannelIds.length === 0) return

    // Create one filtered subscription per channel — filtered postgres_changes
    // subscriptions work reliably with RLS, whereas a single unfiltered
    // subscription does not deliver full payloads when RLS is enabled.
    const subscriptions = trackedChannelIds.map((channelId) =>
      supabase
        .channel(`home-posts-realtime-${channelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
            filter: `channel_id=eq.${channelId}`,
          },
          async (payload) => {
            if (payload.eventType === 'DELETE') {
              const postId = (payload.old as { id?: string })?.id
              if (postId) onPostDeletedRef.current(postId)
              return
            }

            const updated = payload.new as {
              id: string
              channel_id: string
              is_moderated: boolean
              author_id: string
            }

            // Only show approved/moderated posts
            if (!updated.is_moderated) return

            const { data } = await supabase
              .from('posts')
              .select(`
                id, title, content, images, is_pinned, created_at, updated_at,
                author_id, channel_id, approval_status, is_moderated, moderation_reason, likes_count,
                author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
                channel:channels(id, name, slug, description, icon)
              `)
              .eq('id', updated.id)
              .single()

            if (!data) return

            const feedPost: FeedPost = {
              id: data.id,
              channel_id: data.channel_id,
              author_id: data.author_id,
              title: data.title,
              content: data.content,
              images: data.images,
              is_pinned: data.is_pinned,
              is_moderated: data.is_moderated,
              moderation_reason: data.moderation_reason,
              approval_status: data.approval_status,
              created_at: data.created_at,
              updated_at: data.updated_at,
              author: Array.isArray(data.author) ? (data.author[0] ?? null) : (data.author ?? null),
              channel: Array.isArray(data.channel) ? (data.channel[0] ?? null) : (data.channel ?? null),
              like_count: data.likes_count ?? 0,
              comment_count: 0,
              user_has_liked: false,
              like_id: null,
              pending_edit: null,
            }

            onPostUpsertedRef.current(feedPost, payload.eventType === 'INSERT')
          }
        )
        .subscribe()
    )

    return () => {
      subscriptions.forEach((sub) => void supabase.removeChannel(sub))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedChannelIds.join(',')])
}
