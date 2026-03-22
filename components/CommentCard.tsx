'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import CommentLikeButton from '@/components/CommentLikeButton'
import CommentForm from '@/components/CommentForm'
import CommentAdminMenu from '@/components/CommentAdminMenu'
import EditCommentForm from '@/components/EditCommentForm'
import { formatRelativeTime, getInitials, getRoleBadgeColor } from '@/lib/utils'
import type { Comment, Profile } from '@/lib/types'

// Avatar sizes
const AVATAR_SIZE = 34
const REPLY_AVATAR_SIZE = 28

// Height of the L-curve — with REPLY_AVATAR_SIZE=28, CURVE_HEIGHT=14 means
// the curve's horizontal bar (at y=14) aligns with the reply avatar's center (28/2=14).
const CURVE_HEIGHT = 14

interface CommentCardProps {
  comment: Comment & { author?: Profile; like_count?: number; user_has_liked?: boolean; like_id?: string | null }
  currentUserId?: string
  currentUserRole?: string
  postId: string
  onCommentDeleted?: (commentId: string) => void
  onReplyCreated?: (reply: any) => void
  onCommentUpdated?: (comment: Comment) => void
  isReply?: boolean
  depth?: number                 // 0 = top-level, 1 = reply, 2 = reply-to-reply (no further nesting)
  onProfileClick?: (userId: string) => void
  replyCount?: number
  repliesExpanded?: boolean
  onToggleReplies?: () => void
  showThreadLine?: boolean       // parent: vertical line below avatar
  showCurvedConnector?: boolean  // reply: L-curve connecting from parent thread line
  isLastReply?: boolean          // reply: controls bottom padding (pb-2 vs pb-0)
  showConnectorLine?: boolean    // reply: explicit control of connector line; falls back to !isLastReply
  onConnectorClick?: () => void  // reply: makes the connector column clickable (collapses parent thread)
  lineHighlighted?: boolean      // whether thread lines should appear highlighted (coordinated from parent)
  onLineMouseEnter?: () => void  // notify parent when hovering a line segment
  onLineMouseLeave?: () => void  // notify parent when leaving a line segment
  replyLineHighlighted?: boolean    // reply: whether the level-2 thread line should appear highlighted
  onReplyLineMouseEnter?: () => void  // reply: notify parent when hovering the level-2 thread line
  onReplyLineMouseLeave?: () => void  // reply: notify parent when leaving the level-2 thread line
  topLevelCommentId?: string         // reply: routes new replies to the top-level thread (flatten model)
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
  depth = 0,
  onProfileClick,
  replyCount = 0,
  repliesExpanded = false,
  onToggleReplies,
  showThreadLine = false,
  showCurvedConnector = false,
  isLastReply = true,
  showConnectorLine,
  onConnectorClick,
  lineHighlighted = false,
  onLineMouseEnter,
  onLineMouseLeave,
  replyLineHighlighted = false,
  onReplyLineMouseEnter,
  onReplyLineMouseLeave,
  topLevelCommentId,
}: CommentCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const replyFormRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showReplyForm) {
      setTimeout(() => {
        const el = replyFormRef.current
        if (!el) return

        // Find the nearest scrollable ancestor (the modal-scroll container)
        let scrollParent: HTMLElement | null = el.parentElement
        while (scrollParent && scrollParent.scrollHeight <= scrollParent.clientHeight) {
          scrollParent = scrollParent.parentElement
        }
        const container = scrollParent ?? document.documentElement

        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        // ~100px accounts for the sticky comment form at the bottom of the panel
        const stickyOffset = 100
        const gap = elRect.bottom + 16 - (containerRect.bottom - stickyOffset)
        if (gap > 0) {
          container.scrollBy({ top: gap, behavior: 'smooth' })
        }
      }, 50)
    }
  }, [showReplyForm])
  const [deleting, setDeleting] = useState(false)
  const [updatedComment, setUpdatedComment] = useState(comment)

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete comment')
      onCommentDeleted?.(comment.id)
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    } finally {
      setDeleting(false)
    }
  }

  const handleCommentUpdated = (updated: Comment) => {
    setUpdatedComment(updated)
    setShowEditForm(false)
    onCommentUpdated?.(updated)
  }

  const handleReplyCreated = (reply: any) => {
    setShowReplyForm(false)
    onReplyCreated?.(reply)
  }

  const isOwner = currentUserId === comment.author_id

  const renderAvatar = (size: number) =>
    comment.author?.avatar_url ? (
      <div
        className="relative overflow-hidden rounded-full flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={comment.author.avatar_url}
          alt={`${comment.author?.full_name} avatar`}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    ) : (
      <div
        className="flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {getInitials(comment.author?.full_name || 'Unknown')}
      </div>
    )

  // Shared bubble markup
  const bubble = (
    <div className="flex items-center gap-1 group w-fit">
      <div className="bg-muted rounded-2xl px-3 py-2 w-fit max-w-full">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <button
            onClick={() => comment.author?.id && onProfileClick?.(comment.author.id)}
            className="font-semibold text-sm hover:underline text-left leading-none"
          >
            {comment.author?.full_name}
          </button>
          {comment.author?.role && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(comment.author.role)}`}>
              {comment.author.role}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground break-words whitespace-pre-wrap leading-snug">
          {updatedComment.content}
        </p>
      </div>
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <CommentAdminMenu
          commentId={comment.id}
          isAdmin={currentUserRole === 'Admin'}
          onCommentDeleted={onCommentDeleted}
        />
      </div>
    </div>
  )

  if (showEditForm) {
    return (
      <div className="py-1">
        <EditCommentForm
          comment={updatedComment}
          onCancel={() => setShowEditForm(false)}
          onCommentUpdated={handleCommentUpdated}
        />
      </div>
    )
  }

  // ─── REPLY LAYOUT ────────────────────────────────────────────────────────────
  if (isReply) {
    return (
      <div className={isLastReply ? 'pb-2' : 'pb-0'}>
        <div className="flex gap-2">

          {/* Connector column — same pixel width as parent avatar column */}
          <div
            className={`flex flex-col flex-shrink-0 ${onConnectorClick ? 'cursor-pointer' : ''}`}
            style={{ width: AVATAR_SIZE }}
            onClick={onConnectorClick}
            onMouseEnter={onLineMouseEnter}
            onMouseLeave={onLineMouseLeave}
          >
            {showCurvedConnector && (
              // SVG bezier curve: starts at top of thread line, curves right to reply avatar center.
              // CURVE_HEIGHT=14 = REPLY_AVATAR_SIZE/2, so curve ends exactly at avatar vertical center.
              <svg
                className={`transition-colors ${lineHighlighted ? 'text-brand-maroon/70 dark:text-slate-400/70' : 'text-brand-maroon/40 dark:text-slate-500/50'}`}
                style={{
                  width: (AVATAR_SIZE - 3) / 2 + 8,
                  height: CURVE_HEIGHT,
                  marginLeft: (AVATAR_SIZE - 3) / 2,
                  display: 'block',
                  overflow: 'visible',
                }}
                viewBox={`0 0 ${(AVATAR_SIZE - 3) / 2 + 8} ${CURVE_HEIGHT}`}
                fill="none"
              >
                <path
                  d={`M 1.5 0 C 1.5 ${CURVE_HEIGHT} ${((AVATAR_SIZE - 3) / 2 + 8) * 0.5} ${CURVE_HEIGHT} ${(AVATAR_SIZE - 3) / 2 + 8 - 1.5} ${CURVE_HEIGHT}`}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="butt"
                />
                <circle
                  cx={(AVATAR_SIZE - 3) / 2 + 8 - 1.5}
                  cy={CURVE_HEIGHT}
                  r={1.5}
                  fill="currentColor"
                />
              </svg>
            )}
            {(showConnectorLine ?? !isLastReply) && (
              <div
                className={`w-[3px] flex-1 rounded-t-full transition-colors ${lineHighlighted ? 'bg-brand-maroon/70 dark:bg-slate-400/70' : 'bg-brand-maroon/40 dark:bg-slate-500/50'}`}
                style={{ marginLeft: (AVATAR_SIZE - 3) / 2 }}
              />
            )}
          </div>

          {/* Reply avatar + bubble */}
          <div className="flex gap-2 flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <button
                onClick={() => comment.author?.id && onProfileClick?.(comment.author.id)}
                className="hover:opacity-80 transition-opacity"
              >
                {renderAvatar(REPLY_AVATAR_SIZE)}
              </button>
              {showThreadLine ? (
                <button
                  onClick={onToggleReplies}
                  onMouseEnter={onReplyLineMouseEnter}
                  onMouseLeave={onReplyLineMouseLeave}
                  className="flex flex-col items-center flex-1 mt-1"
                  aria-label="Hide replies"
                >
                  <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${replyLineHighlighted ? 'border-brand-maroon/70 dark:border-slate-400/70' : 'border-brand-maroon/40 dark:border-slate-500/50'}`}>
                    <span className={`text-[13px] font-bold leading-none transition-colors ${replyLineHighlighted ? 'text-brand-maroon/90 dark:text-slate-300' : 'text-brand-maroon/60 dark:text-slate-400'}`}>−</span>
                  </div>
                  <div className={`w-[3px] flex-1 transition-colors ${replyLineHighlighted ? 'bg-brand-maroon/70 dark:bg-slate-400/70' : 'bg-brand-maroon/40 dark:bg-slate-500/50'}`} />
                </button>
              ) : replyCount > 0 && depth < 2 ? (
                <button
                  onClick={onToggleReplies}
                  className="flex flex-col items-center mt-1 gap-0.5 group"
                  aria-label={`View ${replyCount} replies`}
                >
                  <div className="w-[3px] h-4 bg-brand-maroon/30 dark:bg-slate-500/40 rounded-full group-hover:bg-brand-maroon/60 dark:group-hover:bg-slate-400/60 transition-colors" />
                  <div className="w-[18px] h-[18px] rounded-full border border-brand-maroon/40 dark:border-slate-500/50 flex items-center justify-center group-hover:border-brand-maroon/70 dark:group-hover:border-slate-400/70 transition-colors">
                    <span className="text-[9px] font-bold text-brand-maroon/60 dark:text-slate-400 leading-none group-hover:text-brand-maroon/90 dark:group-hover:text-slate-300 transition-colors">
                      {replyCount}
                    </span>
                  </div>
                </button>
              ) : null}
            </div>

            <div className="flex-1 min-w-0">
              {bubble}
              <div className="flex items-center gap-0.5 mt-0.5 ml-1 text-xs text-muted-foreground">
                <span className="px-1">{formatRelativeTime(comment.created_at)}</span>
                <span className="text-muted-foreground/40 select-none">·</span>
                <>
                  <button
                    onClick={() => setShowReplyForm(!showReplyForm)}
                    className="px-2 py-1 hover:text-foreground transition-colors rounded"
                  >
                    Reply
                  </button>
                  <span className="text-muted-foreground/40 select-none">·</span>
                </>
                <CommentLikeButton
                  commentId={comment.id}
                  likeCount={comment.like_count || 0}
                  userHasLiked={comment.user_has_liked || false}
                  likeId={comment.like_id ?? null}
                />
                {isOwner && (
                  <>
                    <span className="text-muted-foreground/40 select-none">·</span>
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="px-2 py-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded"
                    >
                      Edit
                    </button>
                    <span className="text-muted-foreground/40 select-none">·</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-2 py-1 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded disabled:opacity-50"
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </>
                )}
              </div>

              {showReplyForm && (
                <div className="mt-2" ref={replyFormRef}>
                  <CommentForm
                    postId={postId}
                    parentCommentId={topLevelCommentId ?? comment.id}
                    onCommentCreated={handleReplyCreated}
                    onCancel={() => setShowReplyForm(false)}
                    placeholder={`Reply to ${comment.author?.full_name}…`}
                    isReply={true}
                  />
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    )
  }

  // ─── TOP-LEVEL COMMENT LAYOUT ─────────────────────────────────────────────
  return (
    <div className={showThreadLine ? 'pt-2' : 'py-2'}>
      <div className="flex gap-2">

        {/* Avatar column — fixed width so thread line stays aligned with L-curve */}
        <div className="flex flex-col flex-shrink-0 items-center" style={{ width: AVATAR_SIZE }}>
          <button
            onClick={() => comment.author?.id && onProfileClick?.(comment.author.id)}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            {renderAvatar(AVATAR_SIZE)}
          </button>
          {showThreadLine ? (
            <button
              onClick={onToggleReplies}
              onMouseEnter={onLineMouseEnter}
              onMouseLeave={onLineMouseLeave}
              className="flex flex-col items-center flex-1 mt-1"
              aria-label="Hide replies"
            >
              <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${lineHighlighted ? 'border-brand-maroon/70 dark:border-slate-400/70' : 'border-brand-maroon/40 dark:border-slate-500/50'}`}>
                <span className={`text-[13px] font-bold leading-none transition-colors ${lineHighlighted ? 'text-brand-maroon/90 dark:text-slate-300' : 'text-brand-maroon/60 dark:text-slate-400'}`}>−</span>
              </div>
              <div className={`w-[3px] flex-1 transition-colors ${lineHighlighted ? 'bg-brand-maroon/70 dark:bg-slate-400/70' : 'bg-brand-maroon/40 dark:bg-slate-500/50'}`} />
            </button>
          ) : replyCount > 0 ? (
            <button
              onClick={onToggleReplies}
              className="flex flex-col items-center mt-1 gap-0.5 group"
              aria-label={`View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
            >
              <div className="w-[3px] h-5 bg-brand-maroon/30 dark:bg-slate-500/40 rounded-full group-hover:bg-brand-maroon/60 dark:group-hover:bg-slate-400/60 transition-colors" />
              <div className="w-[18px] h-[18px] rounded-full border border-brand-maroon/40 dark:border-slate-500/50 flex items-center justify-center group-hover:border-brand-maroon/70 dark:group-hover:border-slate-400/70 transition-colors">
                <span className="text-[9px] font-bold text-brand-maroon/60 dark:text-slate-400 leading-none group-hover:text-brand-maroon/90 dark:group-hover:text-slate-300 transition-colors">
                  {replyCount}
                </span>
              </div>
            </button>
          ) : null}
        </div>

        {/* Content */}
        <div className={`flex-1 min-w-0 ${showThreadLine ? 'pb-0' : ''}`}>
          {bubble}

          <div className="flex items-center gap-0.5 mt-0.5 ml-1 text-xs text-muted-foreground">
            <span className="px-1">{formatRelativeTime(comment.created_at)}</span>
            <span className="text-muted-foreground/40 select-none">·</span>
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="px-2 py-1 hover:text-foreground transition-colors rounded"
            >
              Reply
            </button>
            <span className="text-muted-foreground/40 select-none">·</span>
            <CommentLikeButton
              commentId={comment.id}
              likeCount={comment.like_count || 0}
              userHasLiked={comment.user_has_liked || false}
              likeId={comment.like_id ?? null}
            />
            {isOwner && (
              <>
                <span className="text-muted-foreground/40 select-none">·</span>
                <button
                  onClick={() => setShowEditForm(true)}
                  className="px-2 py-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors rounded"
                >
                  Edit
                </button>
                <span className="text-muted-foreground/40 select-none">·</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-1 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </>
            )}
          </div>

          {showReplyForm && (
            <div className="mt-2" ref={replyFormRef}>
              <CommentForm
                postId={postId}
                parentCommentId={comment.id}
                onCommentCreated={handleReplyCreated}
                onCancel={() => setShowReplyForm(false)}
                placeholder={`Reply to ${comment.author?.full_name}…`}
                isReply={true}
              />
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
