'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'

interface CommentLikeButtonProps {
  commentId: string
  likeCount: number
  userHasLiked: boolean
  onLikeChange?: (newCount: number, newLikeStatus: boolean) => void
}

export default function CommentLikeButton({
  commentId,
  likeCount,
  userHasLiked,
  onLikeChange,
}: CommentLikeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(userHasLiked)
  const [count, setCount] = useState(likeCount)
  const [likeId, setLikeId] = useState<string | null>(null)

  const handleLike = async () => {
    setLoading(true)
    try {
      if (liked) {
        // Unlike
        if (!likeId) return

        const response = await fetch(`/api/comment-likes/${likeId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to unlike')
        }

        setLiked(false)
        setCount(count - 1)
        setLikeId(null)
        onLikeChange?.(count - 1, false)
      } else {
        // Like
        const response = await fetch('/api/comment-likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment_id: commentId }),
        })

        if (!response.ok) {
          throw new Error('Failed to like')
        }

        const data = await response.json()
        setLiked(true)
        setCount(count + 1)
        setLikeId(data.id)
        onLikeChange?.(count + 1, true)
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
