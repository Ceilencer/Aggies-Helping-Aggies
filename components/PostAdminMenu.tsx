'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MoreVertical } from 'lucide-react'
import type { Channel } from '@/lib/types'

interface PostAdminMenuProps {
  postId: string
  postChannelId: string
  isAdmin: boolean
  channels: Channel[]
  onPostDeleted?: () => void
  onChannelUpdated?: (channelId: string) => void
}

export default function PostAdminMenu({
  postId,
  postChannelId,
  isAdmin,
  channels,
  onPostDeleted,
  onChannelUpdated,
}: PostAdminMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!isAdmin) {
    return null
  }

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/posts/${postId}/admin-delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      setIsOpen(false)
      onPostDeleted?.()
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleChangeChannel = async (channelId: string) => {
    if (channelId === postChannelId) {
      setIsOpen(false)
      return
    }

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/posts/${postId}/change-channel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId }),
      })

      if (!response.ok) {
        throw new Error('Failed to change channel')
      }

      setIsOpen(false)
      onChannelUpdated?.(channelId)
    } catch (error) {
      console.error('Error changing channel:', error)
      alert('Failed to change channel')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0"
        title="Admin Options"
      >
        <MoreVertical size={16} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-950 border border-border rounded-md shadow-lg z-50 min-w-[150px]">
          {/* Change Channel Submenu */}
          <div className="border-b border-border last:border-b-0">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
              Move to Channel
            </div>
            <div className="max-h-48 overflow-y-auto">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChangeChannel(channel.id)}
                  disabled={isUpdating || channel.id === postChannelId}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed ${
                    channel.id === postChannelId ? 'font-semibold' : ''
                  }`}
                >
                  {channel.icon && <span className="mr-2">{channel.icon}</span>}
                  {channel.name}
                </button>
              ))}
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDeletePost}
            disabled={isDeleting}
            className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Post
          </button>
        </div>
      )}
    </div>
  )
}
