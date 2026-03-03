'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import CommentLikeButton from '@/components/CommentLikeButton'
import CommentForm from '@/components/CommentForm'
import CommentAdminMenu from '@/components/CommentAdminMenu'
import EditCommentForm from '@/components/EditCommentForm'
import { formatRelativeTime, getInitials, getRoleBadgeColor } from '@/lib/utils'
import { Trash2, Edit2 } from 'lucide-react'
import type { Comment, Profile } from '@/lib/types'

interface CommentCardProps {
  comment: Comment & { author?: Profile; like_count?: number; user_has_liked?: boolean; like_id?: string | null }
  currentUserId?: string
  currentUserRole?: string
  postId: string
  onCommentDeleted?: (commentId: string) => void
  onReplyCreated?: (reply: any) => void
  onCommentUpdated?: (comment: Comment) => void
  isReply?: boolean
  onProfileClick?: (userId: string) => void
  replyCount?: number
  replyIndex?: number
}

export default function CommentCard({
  comment,
  currentUserId,
  currentUserRole,
  postId,
  onCommentDeleted,
  onReplyCreated,
  onCommentUpdated,
  isReply = false,
  onProfileClick,
}: CommentCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatedComment, setUpdatedComment] = useState(comment)

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

  const handleCommentUpdated = (updatedComment: Comment) => {
    setUpdatedComment(updatedComment)
    setShowEditForm(false)
    onCommentUpdated?.(updatedComment)
  }

  const handleReplyCreated = (reply: any) => {
    setShowReplyForm(false)
    onReplyCreated?.(reply)
  }

  if (showEditForm) {
    return (
      <div className={isReply ? 'ml-8 mt-4' : ''}>
        <EditCommentForm
          comment={updatedComment}
          onCancel={() => setShowEditForm(false)}
          onCommentUpdated={handleCommentUpdated}
        />
      </div>
    )
  }

  return (
    <div className={isReply ? 'ml-8 mt-4' : ''}>
      <Card className="p-4">
        <div className="flex gap-3">
          {/* Avatar - Clickable */}
          <button 
            onClick={() => comment.author?.id && onProfileClick?.(comment.author.id)}
            className="flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
          >
            {comment.author?.avatar_url ? (
              <div className="relative h-8 w-8 overflow-hidden rounded-full">
                <Image
                  src={comment.author.avatar_url}
                  alt={`${comment.author?.full_name} avatar`}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">
                {getInitials(comment.author?.full_name || 'Unknown')}
              </div>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={() => comment.author?.id && onProfileClick?.(comment.author.id)}
                  className="font-semibold text-sm hover:underline cursor-pointer text-left"
                >
                  {comment.author?.full_name}
                </button>
                {comment.author?.role && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(comment.author.role)}`}>
                    {comment.author.role}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>
              <CommentAdminMenu
                commentId={comment.id}
                isAdmin={currentUserRole === 'Admin'}
                onCommentDeleted={onCommentDeleted}
              />
            </div>

            <p className="text-sm text-foreground mt-2 break-words whitespace-pre-wrap">
              {updatedComment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <CommentLikeButton
                commentId={comment.id}
                likeCount={comment.like_count || 0}
                userHasLiked={comment.user_has_liked || false}
                likeId={comment.like_id ?? null}
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
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEditForm(!showEditForm)}
                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 gap-2"
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 gap-2"
                  >
                    <Trash2 size={16} />
                  </Button>
                </>
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
