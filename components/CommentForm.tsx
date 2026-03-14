'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Comment, FeedAuthorDTO } from '@/lib/types'

interface CommentFormProps {
  postId: string
  parentCommentId?: string
  currentUserProfile?: FeedAuthorDTO | null
  onOptimisticComment?: (tempComment: Comment) => void
  onCommentCreated?: (comment: Comment, tempId?: string) => void
  onOptimisticFailed?: (tempId: string) => void
  placeholder?: string
  isReply?: boolean
}

export default function CommentForm({
  postId,
  parentCommentId,
  currentUserProfile,
  onOptimisticComment,
  onCommentCreated,
  onOptimisticFailed,
  placeholder = 'Add a comment...',
  isReply = false,
}: CommentFormProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!content.trim()) {
      setError('Comment cannot be empty')
      return
    }

    if (content.length > 1000) {
      setError('Comment must be 1000 characters or less')
      return
    }

    const trimmedContent = content.trim()
    const tempId = `optimistic-${Date.now()}`

    // Optimistic update: add the comment immediately if we have the user profile
    if (currentUserProfile && onOptimisticComment) {
      const now = new Date().toISOString()
      const tempComment: Comment = {
        id: tempId,
        post_id: postId,
        author_id: currentUserProfile.id,
        parent_comment_id: parentCommentId,
        content: trimmedContent,
        is_moderated: true,
        created_at: now,
        updated_at: now,
        author: currentUserProfile as Comment['author'],
        like_count: 0,
        user_has_liked: false,
      }
      onOptimisticComment(tempComment)
      setContent('')
    }

    setLoading(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          content: trimmedContent,
          parent_comment_id: parentCommentId || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create comment')
      }

      const newComment = await response.json()

      if (currentUserProfile && onOptimisticComment) {
        // Replace optimistic placeholder with real comment
        onCommentCreated?.(newComment, tempId)
      } else {
        // No optimistic update was done — clear input and add normally
        setContent('')
        onCommentCreated?.(newComment)
      }
    } catch (err: unknown) {
      console.error('Error creating comment:', err)
      const message = err instanceof Error ? err.message : 'Failed to create comment'
      setError(message)

      if (currentUserProfile && onOptimisticComment) {
        // Roll back the optimistic comment and restore the input
        onOptimisticFailed?.(tempId)
        setContent(trimmedContent)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${isReply ? 'ml-8 mt-3' : ''}`}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px] resize-none"
        disabled={loading}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <div className="flex gap-2 justify-end">
        {isReply && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setContent('')}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={loading || !content.trim()}
        >
          {loading ? 'Posting...' : isReply ? 'Reply' : 'Comment'}
        </Button>
      </div>
    </form>
  )
}
