'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CommentForm from '@/components/CommentForm'
import CommentCard from '@/components/CommentCard'
import type { Comment, Profile } from '@/lib/types'

interface CommentsSectionProps {
  postId: string
  currentUserId?: string
  currentUserRole?: string
  onProfileClick?: (userId: string) => void
  onCommentCountChange?: (newCount: number) => void
}

export default function CommentsSection({
  postId,
  currentUserId,
  currentUserRole,
  onProfileClick,
  onCommentCountChange,
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
      onCommentCountChange?.(data.length)
    } catch (err: any) {
      console.error('Error loading comments:', err)
      setError(err.message || 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleCommentCreated = (newComment: Comment) => {
    const newComments = [newComment, ...comments]
    setComments(newComments)
    onCommentCountChange?.(newComments.length)
  }

  const handleCommentDeleted = (commentId: string) => {
    const newComments = comments.filter(c => c.id !== commentId)
    setComments(newComments)
    onCommentCountChange?.(newComments.length)
  }

  const handleReplyCreated = (reply: Comment) => {
    const newComments = [reply, ...comments]
    setComments(newComments)
    onCommentCountChange?.(newComments.length)
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
                  currentUserRole={currentUserRole}
                  postId={postId}
                  onCommentDeleted={handleCommentDeleted}
                  onReplyCreated={handleReplyCreated}
                  onProfileClick={onProfileClick}
                  replyCount={getReplies(comment.id).length}
                />
                {/* Replies */}
                {getReplies(comment.id).map((reply, idx) => (
                  <CommentCard
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    postId={postId}
                    onCommentDeleted={handleCommentDeleted}
                    isReply={true}
                    onProfileClick={onProfileClick}
                    replyIndex={idx}
                    replyCount={getReplies(comment.id).length}
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
