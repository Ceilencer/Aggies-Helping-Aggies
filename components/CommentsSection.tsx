'use client'

import { useEffect, useRef, useState } from 'react'
import CommentForm from '@/components/CommentForm'
import CommentCard from '@/components/CommentCard'
import { createClient } from '@/lib/supabase/client'
import { ChevronUp } from 'lucide-react'
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
  // Tracks which top-level comment threads have their replies expanded
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
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

      if (!response.ok) throw new Error('Failed to load comments')

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
    // Auto-expand the parent thread so the new reply is immediately visible
    if (reply.parent_comment_id) {
      setExpandedReplies(prev => new Set([...prev, reply.parent_comment_id!]))
    }
  }

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      if (next.has(commentId)) {
        next.delete(commentId)
      } else {
        next.add(commentId)
      }
      return next
    })
  }

  // Organize comments and replies
  const topLevelComments = comments.filter(c => !c.parent_comment_id)
  const getReplies = (parentCommentId: string) =>
    comments.filter(c => c.parent_comment_id === parentCommentId)

  return (
    <div>
      {/* Section heading */}
      <div className="pb-3 mb-3 border-b border-border">
        <h3 className="font-semibold text-base text-foreground">
          Comments ({comments.length})
        </h3>
      </div>

      {/* New comment form */}
      <div className="pb-4 mb-2 border-b border-border">
        <CommentForm
          postId={postId}
          currentUserProfile={currentUserProfile}
          onOptimisticComment={handleOptimisticComment}
          onCommentCreated={handleCommentCreated}
          onOptimisticFailed={handleOptimisticFailed}
        />
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Loading comments…
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      ) : topLevelComments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div>
          {topLevelComments.map((comment) => {
            const replies = getReplies(comment.id)
            const isExpanded = expandedReplies.has(comment.id)

            return (
              // Border wraps the whole group (parent + replies) so no line splits them
              // Border wraps the whole group (parent + replies) so no line splits them
              <div key={comment.id} className="border-b border-border last:border-b-0">
                <CommentCard
                  comment={comment}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  postId={postId}
                  onCommentDeleted={handleCommentDeleted}
                  onReplyCreated={handleReplyCreated}
                  onProfileClick={onProfileClick}
                  replyCount={replies.length}
                  repliesExpanded={isExpanded}
                  onToggleReplies={() => toggleReplies(comment.id)}
                  showThreadLine={isExpanded && replies.length > 0}
                />

                {/* Replies — only shown when expanded, each gets the L-curve connector */}
                {isExpanded && replies.map((reply, index) => (
                  <CommentCard
                    key={reply.id}
                    comment={reply}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    postId={postId}
                    onCommentDeleted={handleCommentDeleted}
                    isReply={true}
                    onProfileClick={onProfileClick}
                    showCurvedConnector={true}
                    isLastReply={index === replies.length - 1}
                  />
                ))}

                {isExpanded && replies.length > 0 && (
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className="mb-3 ml-10 flex items-center gap-1 text-xs font-semibold text-brand-maroon dark:text-slate-400 hover:opacity-75 transition-opacity"
                  >
                    <ChevronUp size={13} />Hide replies
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
