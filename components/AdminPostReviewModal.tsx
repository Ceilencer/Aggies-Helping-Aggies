'use client'

import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'
import { PostImageGrid } from '@/components/PostImageGrid'
import { getInitials, getRoleBadgeColor } from '@/lib/utils'
import type { AdminPendingPostDTO, FeedChannelDTO } from '@/lib/types'

const CANNED_REASONS = [
  'Violates community guidelines',
  'Inappropriate or offensive content',
  'Spam or self-promotion',
  'Misleading or false information',
  'Off-topic for this channel',
  'Duplicate post',
  'Political content',
  'Other',
] as const

const DURATION_OPTIONS = [1, 3, 7, 14] as const

export interface AdminReviewDenyState {
  open: boolean
  selected: Set<string>
  custom: string
}

export interface AdminReviewOverrides {
  duration: number
  channelId: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  post: AdminPendingPostDTO | null
  channels: FeedChannelDTO[]
  overrides: AdminReviewOverrides
  denyState: AdminReviewDenyState | undefined
  busy: boolean
  defaultDuration: number
  onSetDuration: (d: number) => void
  onSetChannel: (id: string) => void
  onApprove: () => void
  onStartDeny: () => void
  onConfirmDeny: () => void
  onCancelDeny: () => void
  onToggleDenyReason: (reason: string) => void
  onDenyCustomChange: (value: string) => void
  onViewProfile: (userId: string) => void
}

export default function AdminPostReviewModal({
  isOpen,
  onClose,
  post,
  channels,
  overrides,
  denyState,
  busy,
  defaultDuration,
  onSetDuration,
  onSetChannel,
  onApprove,
  onStartDeny,
  onConfirmDeny,
  onCancelDeny,
  onToggleDenyReason,
  onDenyCustomChange,
  onViewProfile,
}: Props) {
  if (!post) return null

  const isEditReview = post.approval_status === 'pending_edit'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={post.author?.full_name ? `${post.author.full_name}'s Post` : 'Review Post'}
      contentClassName=""
    >
      {/* ── Author header ── */}
      <div className="px-6 pt-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {getInitials(post.author?.full_name || 'U')}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-sm leading-tight">{post.author?.full_name || 'Unknown'}</p>
              {post.author?.role && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${getRoleBadgeColor(post.author.role)}`}>
                  {post.author.role}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {post.channel?.name || 'Unknown channel'} · {new Date(post.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Post content ── */}
        {isEditReview && post.pending_edit ? (
          <div className="space-y-3">
            <div className="rounded border border-muted bg-muted/30 p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Current</p>
              <p className="font-semibold text-sm">{post.title}</p>
              <p className="text-sm text-card-subtext mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{post.content}</p>
            </div>
            <div className="rounded border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 p-3">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide">Proposed Edit</p>
              <p className="font-semibold text-sm">{post.pending_edit.proposed_title}</p>
              <p className="text-sm text-card-subtext mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{post.pending_edit.proposed_content}</p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-card-header-text mb-2">{post.title}</h2>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{post.content}</p>
          </div>
        )}
      </div>

      {/* ── Images (full-bleed) ── */}
      {post.images && post.images.length > 0 && (
        <div className="mt-4">
          <PostImageGrid images={post.images} postTitle={post.title} />
        </div>
      )}

      {/* ── Admin controls (replaces comments) ── */}
      <div className="px-6 pt-4 pb-6 space-y-4 border-t border-border mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin Actions</p>

        {/* Author stats + profile */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="rounded-md bg-muted/40 px-3 py-2 flex gap-4 text-xs">
            <span className="text-green-700 dark:text-green-400 font-medium">
              ✓ {post.author?.posts_approved ?? 0} approved
            </span>
            <span className="text-red-600 dark:text-red-400 font-medium">
              ✕ {post.author?.posts_denied ?? 0} denied
            </span>
          </div>
          {post.author?.id && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { onViewProfile(post.author!.id); onClose() }}
              disabled={busy}
            >
              View Profile
            </Button>
          )}
        </div>

        {/* Duration + channel (new posts only) */}
        {!isEditReview && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Duration</p>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSetDuration(d)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      overrides.duration === d
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    }`}
                    disabled={busy}
                  >
                    {d === defaultDuration ? `${d}d (Keep)` : `${d}d`}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Channel</p>
              <select
                value={overrides.channelId}
                onChange={(e) => onSetChannel(e.target.value)}
                disabled={busy}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Approve */}
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={onApprove}
          disabled={busy}
        >
          {isEditReview ? 'Apply Edit' : 'Approve'}
        </Button>

        {/* Deny section */}
        {!denyState?.open ? (
          <Button
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={onStartDeny}
            disabled={busy}
          >
            {isEditReview ? 'Discard Edit' : 'Deny'} ↓
          </Button>
        ) : (
          <div className="space-y-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reason (select all that apply)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
              {CANNED_REASONS.map((reason) => (
                <label key={reason} className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-input accent-red-600"
                    checked={denyState?.selected?.has(reason) ?? false}
                    onChange={() => onToggleDenyReason(reason)}
                    disabled={busy}
                  />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground leading-snug">{reason}</span>
                </label>
              ))}
            </div>
            {denyState?.selected?.has('Other') && (
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                placeholder="Custom reason…"
                value={denyState?.custom ?? ''}
                onChange={(e) => onDenyCustomChange(e.target.value)}
                disabled={busy}
              />
            )}
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={onConfirmDeny}
                disabled={busy}
              >
                {isEditReview ? 'Discard' : 'Deny'}
              </Button>
              <Button variant="ghost" className="px-3" onClick={onCancelDeny} disabled={busy}>
                ✕
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
