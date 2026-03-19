'use client'

import { useState } from 'react'
import Image from 'next/image'
import CommentLikeButton from '@/components/CommentLikeButton'
import CommentForm from '@/components/CommentForm'
import CommentAdminMenu from '@/components/CommentAdminMenu'
import EditCommentForm from '@/components/EditCommentForm'
import { formatRelativeTime, getInitials, getRoleBadgeColor } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
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
  onProfileClick?: (userId: string) => void
  replyCount?: number
  repliesExpanded?: boolean
  onToggleReplies?: () => void
  showThreadLine?: boolean       // parent: vertical line below avatar
  showCurvedConnector?: boolean  // reply: L-curve connecting from parent thread line
  isLastReply?: boolean          // reply: when false, draws continuation line below L-curve
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
  replyCount = 0,
  repliesExpanded = false,
  onToggleReplies,
  showThreadLine = false,
  showCurvedConnector = false,
  isLastReply = true,
}: CommentCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
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
          <div className="flex flex-col flex-shrink-0" style={{ width: AVATAR_SIZE }}>
            {showCurvedConnector && (
              // SVG bezier curve: starts at top of thread line, curves right to reply avatar center.
              // CURVE_HEIGHT=14 = REPLY_AVATAR_SIZE/2, so curve ends exactly at avatar vertical center.
              <svg
                className="text-brand-maroon dark:text-slate-500 opacity-40 dark:opacity-50"
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
            {!isLastReply && (
              <div
                className="w-[3px] flex-1 bg-brand-maroon/40 dark:bg-slate-500/50 rounded-t-full"
                style={{ marginLeft: (AVATAR_SIZE - 3) / 2 }}
              />
            )}
          </div>

          {/* Reply avatar + bubble — items-start keeps avatar pinned to top of bubble */}
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button
              onClick={() => comment.author?.id && onProfileClick?.(comment.author.id)}
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
            >
              {renderAvatar(REPLY_AVATAR_SIZE)}
            </button>

            <div className="flex-1 min-w-0">
              {bubble}
              <div className="flex items-center gap-0.5 mt-0.5 ml-1 text-xs text-muted-foreground">
                <span className="px-1">{formatRelativeTime(comment.created_at)}</span>
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
          {showThreadLine && (
            <div className="w-[3px] flex-1 mt-1 bg-brand-maroon/40 dark:bg-slate-500/50 rounded-t-full" />
          )}
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
            <div className="mt-2">
              <CommentForm
                postId={postId}
                parentCommentId={comment.id}
                onCommentCreated={handleReplyCreated}
                placeholder={`Reply to ${comment.author?.full_name}…`}
                isReply={true}
              />
            </div>
          )}

          {replyCount > 0 && !repliesExpanded && (
            <button
              onClick={onToggleReplies}
              className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-brand-maroon dark:text-slate-400 hover:opacity-75 transition-opacity"
            >
              <ChevronDown size={13} />View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
