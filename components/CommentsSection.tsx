'use client'

import { useEffect, useRef, useState } from 'react'
import CommentForm from '@/components/CommentForm'
import CommentCard from '@/components/CommentCard'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeStatus } from '@/lib/realtime/RealtimeStatusContext'
import type { Comment, FeedAuthorDTO } from '@/lib/types'

interface CommentsSectionProps {
  postId: string
  currentUserId?: string
  currentUserRole?: string
  currentUserProfile?: FeedAuthorDTO | null
  onProfileClick?: (userId: string) => void
  onCommentCountChange?: (newCount: number) => void
  hideHeader?: boolean
}

export default function CommentsSection({
  postId,
  currentUserId,
  currentUserRole,
  currentUserProfile,
  onProfileClick,
  onCommentCountChange,
  hideHeader = false,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [realtimeOk, setRealtimeOk] = useState(true)
  // Tracks which top-level comment threads have their replies expanded
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  // Tracks which top-level comment's thread line is currently being hovered
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null)
  // Track IDs that were optimistically added by the current user so Realtime doesn't duplicate them
  const optimisticIds = useRef<Set<string>>(new Set())
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const { reportStatus } = useRealtimeStatus()

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
            return [...prev, newComment]
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
      .subscribe((status) => {
        reportStatus(`comments-${postId}`, status)
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeOk(false)
        else if (status === 'SUBSCRIBED') setRealtimeOk(true)
      })

    return () => {
      void supabase.removeChannel(subscription)
    }
  }, [postId, currentUserId, reportStatus])

  // Fallback: poll every 30s if the realtime channel failed to connect
  useEffect(() => {
    if (realtimeOk) return
    const id = setInterval(() => void loadComments(), 30_000)
    return () => clearInterval(id)
  // loadComments is stable — defined below, eslint can't verify but it is
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeOk])

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
    setComments(prev => [...prev, tempComment])
  }

  const handleCommentCreated = (realComment: Comment, tempId?: string) => {
    if (tempId) {
      optimisticIds.current.delete(tempId)
      optimisticIds.current.add(realComment.id)
      setComments(prev => prev.map(c => c.id === tempId ? realComment : c))
    } else {
      setComments(prev => {
        if (prev.some(c => c.id === realComment.id)) return prev
        return [...prev, realComment]
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
      return [...prev, reply]
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
        // Scroll the comment to the top so replies are visible below it
        setTimeout(() => {
          commentRefs.current[commentId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
      }
      return next
    })
  }

  // Organize comments and replies
  // Top-level: most liked first so best content surfaces; replies: oldest first so threads read top-to-bottom
  const topLevelComments = comments
    .filter(c => !c.parent_comment_id)
    .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
  const getReplies = (parentCommentId: string) =>
    comments
      .filter(c => c.parent_comment_id === parentCommentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return (
    <div>
      {/* Section heading */}
      {!hideHeader && (
        <div className="pb-3 mb-3 border-b border-border">
          <h3 className="font-semibold text-base text-foreground">
            Comments ({comments.length})
          </h3>
        </div>
      )}

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
            const level1Replies = getReplies(comment.id)
            const isExpanded = expandedReplies.has(comment.id)
            const isThreadHovered = hoveredThreadId === comment.id
            const lineEnter = () => setHoveredThreadId(comment.id)
            const lineLeave = () => setHoveredThreadId(null)

            return (
              <div key={comment.id} ref={(el) => { commentRefs.current[comment.id] = el }}>
                <CommentCard
                  comment={comment}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  postId={postId}
                  onCommentDeleted={handleCommentDeleted}
                  onReplyCreated={handleReplyCreated}
                  onProfileClick={onProfileClick}
                  replyCount={level1Replies.length}
                  repliesExpanded={isExpanded}
                  onToggleReplies={() => toggleReplies(comment.id)}
                  showThreadLine={isExpanded && level1Replies.length > 0}
                  lineHighlighted={isThreadHovered}
                  onLineMouseEnter={lineEnter}
                  onLineMouseLeave={lineLeave}
                />

                {/* Level-1 replies */}
                {isExpanded && level1Replies.map((reply, index) => {
                  const level2Replies = getReplies(reply.id)
                  const isReplyExpanded = expandedReplies.has(reply.id)
                  const isLast = index === level1Replies.length - 1
                  const isReplyThreadHovered = hoveredThreadId === reply.id
                  const replyLineEnter = () => setHoveredThreadId(reply.id)
                  const replyLineLeave = () => setHoveredThreadId(null)

                  return (
                    <div key={reply.id} className="relative">
                      {/* Absolute continuation line spans the full group height (card + level-2 content)
                          so the connector is unbroken between non-last level-1 siblings */}
                      {!isLast && (
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          onMouseEnter={lineEnter}
                          onMouseLeave={lineLeave}
                          className="absolute cursor-pointer"
                          style={{ left: 8, top: 14, bottom: 0, width: 18 }}
                          aria-label="Hide replies"
                        >
                          <div
                            className={`absolute transition-colors ${isThreadHovered ? 'bg-brand-maroon/70 dark:bg-slate-400/70' : 'bg-brand-maroon/40 dark:bg-slate-500/50'}`}
                            style={{ left: '50%', top: 0, bottom: 0, width: 3, transform: 'translateX(-50%)' }}
                          />
                        </button>
                      )}
                      <CommentCard
                        comment={reply}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        postId={postId}
                        onCommentDeleted={handleCommentDeleted}
                        onReplyCreated={handleReplyCreated}
                        onProfileClick={onProfileClick}
                        isReply={true}
                        depth={1}
                        replyCount={level2Replies.length}
                        repliesExpanded={isReplyExpanded}
                        onToggleReplies={() => toggleReplies(reply.id)}
                        onConnectorClick={() => toggleReplies(comment.id)}
                        lineHighlighted={isThreadHovered}
                        onLineMouseEnter={lineEnter}
                        onLineMouseLeave={lineLeave}
                        showCurvedConnector={true}
                        showConnectorLine={false}
                        isLastReply={!(isReplyExpanded && level2Replies.length > 0)}
                        showThreadLine={isReplyExpanded && level2Replies.length > 0}
                        replyLineHighlighted={isReplyThreadHovered}
                        onReplyLineMouseEnter={replyLineEnter}
                        onReplyLineMouseLeave={replyLineLeave}
                      />

                      {/* Level-2 replies — replies to these flatten back into this thread */}
                      {isReplyExpanded && level2Replies.map((level2Reply, l2Index) => (
                        <div key={level2Reply.id} className="ml-[39px]">
                          <CommentCard
                            comment={level2Reply}
                            currentUserId={currentUserId}
                            currentUserRole={currentUserRole}
                            postId={postId}
                            onCommentDeleted={handleCommentDeleted}
                            onReplyCreated={handleReplyCreated}
                            onProfileClick={onProfileClick}
                            isReply={true}
                            depth={2}
                            showCurvedConnector={true}
                            isLastReply={l2Index === level2Replies.length - 1}
                            onConnectorClick={() => toggleReplies(reply.id)}
                            lineHighlighted={isReplyThreadHovered}
                            onLineMouseEnter={replyLineEnter}
                            onLineMouseLeave={replyLineLeave}
                            topLevelCommentId={reply.id}
                          />
                        </div>
                      ))}

                    </div>
                  )
                })}

              </div>
            )
          })}
        </div>
      )}

      {/* Sticky comment form — stays visible at the bottom while scrolling */}
      <div className="sticky bottom-0 z-10 bg-background pb-4">
        <CommentForm
          postId={postId}
          currentUserProfile={currentUserProfile}
          onOptimisticComment={handleOptimisticComment}
          onCommentCreated={handleCommentCreated}
          onOptimisticFailed={handleOptimisticFailed}
        />
      </div>
    </div>
  )
}
