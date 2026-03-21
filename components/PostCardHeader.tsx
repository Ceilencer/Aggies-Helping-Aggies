'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import UserAvatar from '@/components/UserAvatar'
import PostAdminMenu from '@/components/PostAdminMenu'
import { getRoleBadgeColor } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Edit2 } from 'lucide-react'
import type { ChannelListDTO } from '@/lib/types'
import ChannelIcon from '@/components/ChannelIcon'

interface PostCardHeaderProps {
  post: any
  isAdmin: boolean
  channels: ChannelListDTO[]
  currentUserId?: string
  onPostDeleted?: (postId: string) => void
  onChannelUpdated?: (channelId: string) => void
  onEditClick?: () => void
  onProfileClick?: (userId: string) => void
  onViewPendingEdit?: () => void
}

export default function PostCardHeader({
  post,
  isAdmin,
  channels,
  currentUserId,
  onPostDeleted,
  onChannelUpdated,
  onEditClick,
  onProfileClick,
  onViewPendingEdit,
}: PostCardHeaderProps) {
  const [formattedDate, setFormattedDate] = useState<string>('')
  const [expiryLabel, setExpiryLabel] = useState<{ text: string; className: string } | null>(null)
  const isAuthor = currentUserId === post.author?.id

  useEffect(() => {
    setFormattedDate(new Date(post.created_at).toLocaleDateString())

    const expiresAt = post.expires_at
      ? new Date(post.expires_at).getTime()
      : new Date(post.created_at).getTime() + 14 * 24 * 60 * 60 * 1000
    const msLeft = expiresAt - Date.now()
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

    if (daysLeft <= 0) {
      setExpiryLabel({ text: 'expires today', className: 'text-red-500 dark:text-red-400' })
    } else if (daysLeft === 1) {
      setExpiryLabel({ text: 'expires tomorrow', className: 'text-red-500 dark:text-red-400' })
    } else if (daysLeft <= 3) {
      setExpiryLabel({ text: `expires in ${daysLeft} days`, className: 'text-amber-500 dark:text-amber-400' })
    } else {
      const expireDate = new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      setExpiryLabel({ text: `expires ${expireDate}`, className: 'text-muted-foreground' })
    }
  }, [post.created_at, post.expires_at])

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-3">
        {/* Author Avatar */}
        <UserAvatar 
          user={post.author}
          size="md"
          linkToProfile={false}
          onProfileClick={onProfileClick}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => post.author?.id && onProfileClick?.(post.author.id)}
              className="font-semibold text-card-header-text hover:underline cursor-pointer text-left"
            >
              {post.author?.full_name}
            </button>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(post.author?.role)}`}>
              {post.author?.role}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-card-subtext">
            {post.channel?.slug && (
              <span className="flex items-center gap-1">
                <ChannelIcon slug={post.channel.slug} size={13} />
                {post.channel.name}
              </span>
            )}
            <span>•</span>
            <span>{formattedDate || '—'}</span>
            {expiryLabel && (
              <>
                <span>•</span>
                <span className={expiryLabel.className}>{expiryLabel.text}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-start gap-2 flex-wrap justify-end">
        {post.is_pinned && (
          <span className="text-primary text-sm font-medium shrink-0">📌 Pinned</span>
        )}

        {post.approval_status === 'pending' && !isAdmin && (
          <span className="text-yellow-600 dark:text-yellow-400 text-sm font-medium shrink-0">⏳ Pending Approval</span>
        )}

        {post.approval_status === 'pending_edit' && isAuthor && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-blue-600 dark:text-blue-400 text-sm font-medium shrink-0">✏️ Edit Pending Review</span>
            {onViewPendingEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs px-2 py-0 shrink-0"
                onClick={onViewPendingEdit}
              >
                View Pending Edit
              </Button>
            )}
          </div>
        )}

        {isAuthor && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditClick}
            disabled={!onEditClick}
            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            title={onEditClick ? 'Edit post' : 'Edit pending admin review'}
          >
            <Edit2 size={18} />
          </Button>
        )}

        {currentUserId && !isAuthor && (
          <PostAdminMenu
            postId={post.id}
            postChannelId={post.channel_id}
            isAdmin={isAdmin}
            channels={channels}
            onPostDeleted={onPostDeleted}
            onChannelUpdated={onChannelUpdated}
          />
        )}
      </div>
    </div>
  )
}
