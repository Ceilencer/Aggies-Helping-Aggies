'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import CommentLikeButton from '@/components/CommentLikeButton'
import CommentForm from '@/components/CommentForm'
import { formatRelativeTime, getInitials, getRoleBadgeColor } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import type { Comment, Profile } from '@/lib/types'

interface CommentCardProps {
  comment: Comment & { author?: Profile; like_count?: number; user_has_liked?: boolean }
  currentUserId?: string
  postId: string
  onCommentDeleted?: (commentId: string) => void
  onReplyCreated?: (reply: any) => void
  isReply?: boolean
}

export default function CommentCard({
  comment,
  currentUserId,
  postId,
  onCommentDeleted,
  onReplyCreated,
  isReply = false,
}: CommentCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete comment')
      }

      onCommentDeleted?.(comment.id)
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    } finally {
      setDeleting(false)
    }
  }

  const handleReplyCreated = (reply: any) => {
    setShowReplyForm(false)
    onReplyCreated?.(reply)
  }

  return (
    <div className={isReply ? 'ml-8 mt-4' : ''}>
      <Card className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          {comment.author?.avatar_url ? (
            <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
              <Image
                src={comment.author.avatar_url}
                alt={`${comment.author?.full_name} avatar`}
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">
              {getInitials(comment.author?.full_name || 'Unknown')}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {comment.author?.full_name}
              </span>
              {comment.author?.role && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(comment.author.role)}`}>
                  {comment.author.role}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(comment.created_at)}
              </span>
            </div>

            <p className="text-sm text-foreground mt-2 break-words whitespace-pre-wrap">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <CommentLikeButton
                commentId={comment.id}
                likeCount={comment.like_count || 0}
                userHasLiked={comment.user_has_liked || false}
              />
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-muted-foreground gap-2"
                >
                  💬 Reply
                </Button>
              )}
              {currentUserId === comment.author_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 gap-2"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>

            {/* Reply Form */}
            {showReplyForm && (
              <CommentForm
                postId={postId}
                parentCommentId={comment.id}
                onCommentCreated={handleReplyCreated}
                placeholder={`Reply to ${comment.author?.full_name}...`}
                isReply={true}
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
