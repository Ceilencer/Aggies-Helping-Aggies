'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CommentForm from '@/components/CommentForm'
import CommentCard from '@/components/CommentCard'
import type { Comment, Profile } from '@/lib/types'

interface CommentsSectionProps {
  postId: string
  currentUserId?: string
}

export default function CommentsSection({
  postId,
  currentUserId,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      })

      if (!response.ok) {
        throw new Error('Failed to load comments')
      }

      const data = await response.json()
      setComments(data)
    } catch (err: any) {
      console.error('Error loading comments:', err)
      setError(err.message || 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleCommentCreated = (newComment: Comment) => {
    setComments([newComment, ...comments])
  }

  const handleCommentDeleted = (commentId: string) => {
    setComments(comments.filter(c => c.id !== commentId))
  }

  const handleReplyCreated = (reply: Comment) => {
    setComments([reply, ...comments])
  }

  // Organize comments and replies
  const topLevelComments = comments.filter(c => !c.parent_comment_id)
  const getReplies = (parentCommentId: string) => {
    return comments.filter(c => c.parent_comment_id === parentCommentId)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comment Form */}
        <CommentForm
          postId={postId}
          onCommentCreated={handleCommentCreated}
        />

        {/* Comments List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading comments...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            {error}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4">
            {topLevelComments.map((comment) => (
              <div key={comment.id}>
                <CommentCard
                  comment={comment}
                  currentUserId={currentUserId}
                  postId={postId}
                  onCommentDeleted={handleCommentDeleted}
                  onReplyCreated={handleReplyCreated}
                />
                {/* Replies */}
                {getReplies(comment.id).map((reply) => (
                  <CommentCard
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    postId={postId}
                    onCommentDeleted={handleCommentDeleted}
                    isReply={true}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
