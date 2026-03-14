'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CommentForm from '@/components/CommentForm'
import CommentCard from '@/components/CommentCard'
import { createClient } from '@/lib/supabase/client'
import type { Comment, FeedAuthorDTO } from '@/lib/types'

interface CommentsSectionProps {
  postId: string
  currentUserId?: string
  currentUserRole?: string
  currentUserProfile?: FeedAuthorDTO | null
  onProfileClick?: (userId: string) => void
  onCommentCountChange?: (newCount: number) => void
}

export default function CommentsSection({
  postId,
  currentUserId,
  currentUserRole,
  currentUserProfile,
  onProfileClick,
  onCommentCountChange,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Track IDs that were optimistically added by the current user so Realtime doesn't duplicate them
  const optimisticIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  // Report count changes whenever the comments array length changes (after initial load)
  useEffect(() => {
    if (!loading) {
      onCommentCountChange?.(comments.length)
    }
    // onCommentCountChange intentionally omitted — callers pass inline functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments.length, loading])

  // Supabase Realtime: live comment updates from other users
  useEffect(() => {
    const supabase = createClient()

    const subscription = supabase
      .channel(`comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const incoming = payload.new as { id: string; author_id: string }

          // Skip if this comment was added optimistically by the current user
          if (optimisticIds.current.has(incoming.id)) return
          if (incoming.author_id === currentUserId) return

          const { data } = await supabase
            .from('comments')
            .select('*, author:profiles!comments_author_id_fkey(*)')
            .eq('id', incoming.id)
            .single()

          if (!data) return

          const newComment: Comment = {
            ...data,
            author: Array.isArray(data.author) ? (data.author[0] ?? undefined) : (data.author ?? undefined),
            like_count: 0,
            user_has_liked: false,
          }

          setComments(prev => {
            if (prev.some(c => c.id === newComment.id)) return prev
            return [newComment, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setComments(prev => prev.filter(c => c.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(subscription)
    }
  }, [postId, currentUserId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/posts/${postId}/comments`)

      if (!response.ok) {
        throw new Error('Failed to load comments')
      }

      const data = await response.json()
      setComments(data)
    } catch (err: unknown) {
      console.error('Error loading comments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleOptimisticComment = (tempComment: Comment) => {
    optimisticIds.current.add(tempComment.id)
    setComments(prev => [tempComment, ...prev])
  }

  const handleCommentCreated = (realComment: Comment, tempId?: string) => {
    if (tempId) {
      // Replace the optimistic placeholder with the real comment
      optimisticIds.current.delete(tempId)
      optimisticIds.current.add(realComment.id)
      setComments(prev => prev.map(c => c.id === tempId ? realComment : c))
    } else {
      setComments(prev => {
        if (prev.some(c => c.id === realComment.id)) return prev
        return [realComment, ...prev]
      })
    }
  }

  const handleOptimisticFailed = (tempId: string) => {
    optimisticIds.current.delete(tempId)
    setComments(prev => prev.filter(c => c.id !== tempId))
  }

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const handleReplyCreated = (reply: Comment) => {
    setComments(prev => {
      if (prev.some(c => c.id === reply.id)) return prev
      return [reply, ...prev]
    })
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
          currentUserProfile={currentUserProfile}
          onOptimisticComment={handleOptimisticComment}
          onCommentCreated={handleCommentCreated}
          onOptimisticFailed={handleOptimisticFailed}
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
