'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PostLikeButtonProps {
  postId: string
  likeCount: number
  userHasLiked: boolean
  likeId?: string | null
  onLikeChange?: (newCount: number, newLikeStatus: boolean) => void
}

export default function PostLikeButton({
  postId,
  likeCount,
  userHasLiked,
  likeId: initialLikeId = null,
  onLikeChange,
}: PostLikeButtonProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(userHasLiked)
  const [count, setCount] = useState(likeCount)
  const [likeId, setLikeId] = useState<string | null>(initialLikeId)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const refreshFromDatabase = async (userIdOverride?: string | null) => {
    const userId = userIdOverride ?? currentUserId

    const { count: latestLikeCount } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    let latestLikeId: string | null = null
    let latestLiked = false

    if (userId) {
      const { data: currentUserLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()

      latestLikeId = currentUserLike?.id ?? null
      latestLiked = !!currentUserLike
    }

    const nextCount = latestLikeCount || 0
    setCount(nextCount)
    setLiked(latestLiked)
    setLikeId(latestLikeId)
    onLikeChange?.(nextCount, latestLiked)
  }

  useEffect(() => {
    setLiked(userHasLiked)
  }, [userHasLiked])

  useEffect(() => {
    setCount(likeCount)
  }, [likeCount])

  useEffect(() => {
    setLikeId(initialLikeId)
  }, [initialLikeId])

  useEffect(() => {
    let isMounted = true

    const initializeRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted) return

      const userId = user?.id ?? null
      setCurrentUserId(userId)
      await refreshFromDatabase(userId)

      const channel = supabase
        .channel(`post-likes-${postId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'post_likes',
            filter: `post_id=eq.${postId}`,
          },
          async () => {
            await refreshFromDatabase(userId)
          }
        )
        .subscribe()

      return channel
    }

    let activeChannel: ReturnType<typeof supabase.channel> | null = null
    initializeRealtime().then((channel) => {
      if (channel) {
        activeChannel = channel
      }
    })

    return () => {
      isMounted = false
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [postId])

  const handleLike = async () => {
    setLoading(true)
    try {
      if (liked) {
        // Unlike
        const response = likeId
          ? await fetch(`/api/post-likes/${likeId}`, {
              method: 'DELETE',
            })
          : await fetch(`/api/post-likes?post_id=${encodeURIComponent(postId)}`, {
              method: 'DELETE',
            })

        if (!response.ok) {
          throw new Error('Failed to unlike')
        }

        const nextCount = Math.max(0, count - 1)
        setLiked(false)
        setCount(nextCount)
        setLikeId(null)
        onLikeChange?.(nextCount, false)
        await refreshFromDatabase()
      } else {
        // Like
        const response = await fetch('/api/post-likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: postId }),
        })

        if (!response.ok) {
          throw new Error('Failed to like')
        }

        const data = await response.json()
        const nextCount = count + 1
        setLiked(true)
        setCount(nextCount)
        setLikeId(data?.id ?? null)
        onLikeChange?.(nextCount, true)
        await refreshFromDatabase()
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={loading}
      className={`gap-2 ${
        liked ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'
      }`}
    >
      <Heart
        size={16}
        className={liked ? 'fill-current' : ''}
      />
      <span className="text-xs">{count}</span>
    </Button>
  )
}
