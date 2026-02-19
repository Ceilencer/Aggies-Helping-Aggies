'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Comment } from '@/lib/types'

interface EditCommentFormProps {
  comment: Comment
  onCancel: () => void
  onCommentUpdated: (comment: Comment) => void
}

export default function EditCommentForm({
  comment,
  onCancel,
  onCommentUpdated,
}: EditCommentFormProps) {
  const [content, setContent] = useState(comment.content)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!content.trim()) {
        setError('Comment cannot be empty')
        setLoading(false)
        return
      }

      if (content.length > 1000) {
        setError('Comment must be 1000 characters or less')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/comments/${comment.id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update comment')
      }

      const updatedComment = await response.json()
      onCommentUpdated(updatedComment)
    } catch (err: any) {
      console.error('Comment update error:', err)
      setError(err.message || 'Failed to update comment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-muted/50 rounded-lg">
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Edit your comment..."
        maxLength={1000}
        className="min-h-[100px]"
      />
      <p className="text-xs text-muted-foreground dark:text-white/80">
        {content.length}/1000 characters
      </p>
      <div className="flex gap-2">
        <Button 
          type="submit" 
          size="sm" 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
        <Button 
          type="button" 
          size="sm" 
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
