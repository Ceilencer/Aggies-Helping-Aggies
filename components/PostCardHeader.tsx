'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import PostAdminMenu from '@/components/PostAdminMenu'
import { getInitials, getRoleBadgeColor } from '@/lib/utils'
import type { Channel } from '@/lib/types'

interface PostCardHeaderProps {
  post: any
  isAdmin: boolean
  channels: Channel[]
  onPostDeleted?: (postId: string) => void
}

export default function PostCardHeader({
  post,
  isAdmin,
  channels,
  onPostDeleted,
}: PostCardHeaderProps) {
  const [formattedDate, setFormattedDate] = useState<string>('')

  useEffect(() => {
    setFormattedDate(new Date(post.created_at).toLocaleDateString())
  }, [post.created_at])

  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start space-x-3">
        {/* Author Avatar - Clickable */}
        <Link href={`/users/${post.author?.id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
          {post.author?.avatar_url ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-full">
              <Image
                src={post.author.avatar_url}
                alt={`${post.author?.full_name || 'User'} avatar`}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              {getInitials(post.author?.full_name || 'Unknown')}
            </div>
          )}
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <Link href={`/users/${post.author?.id}`} className="font-semibold text-card-header-text hover:underline">
              {post.author?.full_name}
            </Link>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(post.author?.role)}`}>
              {post.author?.role}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-card-subtext">
            <span>{post.channel?.icon} {post.channel?.name}</span>
            <span>•</span>
            <span>{formattedDate || '—'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {post.is_pinned && (
          <span className="text-primary text-sm font-medium">📌 Pinned</span>
        )}
        
        {isAdmin && (
          <PostAdminMenu
            postId={post.id}
            postChannelId={post.channel_id}
            isAdmin={true}
            channels={channels}
            onPostDeleted={onPostDeleted}
          />
        )}
      </div>
    </div>
  )
}
