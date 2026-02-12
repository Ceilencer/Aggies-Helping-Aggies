'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface CommentFormProps {
  postId: string
  parentCommentId?: string
  onCommentCreated?: (comment: any) => void
  placeholder?: string
  isReply?: boolean
}

export default function CommentForm({
  postId,
  parentCommentId,
  onCommentCreated,
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

    setLoading(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          content: content.trim(),
          parent_comment_id: parentCommentId || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create comment')
      }

      const newComment = await response.json()
      setContent('')
      onCommentCreated?.(newComment)
    } catch (err: any) {
      console.error('Error creating comment:', err)
      setError(err.message || 'Failed to create comment')
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
