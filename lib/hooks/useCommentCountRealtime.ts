'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeStatus } from '@/lib/realtime/RealtimeStatusContext'

interface UseCommentCountRealtimeArgs {
  postIds: string[]
  onCommentInserted: (postId: string) => void
}

const CHANNEL_KEY = 'comment-counts'

export function useCommentCountRealtime({
  postIds,
  onCommentInserted,
}: UseCommentCountRealtimeArgs) {
  const supabase = createClient()
  const { reportStatus } = useRealtimeStatus()

  // Keep a stable ref to the callback and post ID set so the subscription
  // effect doesn't need to re-run when the post list or callback changes.
  const onCommentInsertedRef = useRef(onCommentInserted)
  onCommentInsertedRef.current = onCommentInserted
  const postIdsRef = useRef(new Set(postIds))
  postIdsRef.current = new Set(postIds)

  useEffect(() => {
    if (postIds.length === 0) return

    const subscription = supabase
      .channel(CHANNEL_KEY)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          const postId = (payload.new as { post_id?: string }).post_id
          if (postId && postIdsRef.current.has(postId)) {
            onCommentInsertedRef.current(postId)
          }
        }
      )
      .subscribe((status) => {
        reportStatus(CHANNEL_KEY, status)
      })

    return () => {
      void supabase.removeChannel(subscription)
    }
  // Only re-subscribe if the set of tracked posts changes meaningfully.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postIds.join(',')])
}
