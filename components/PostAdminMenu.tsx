'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MoreVertical, Flag } from 'lucide-react'
import ReportModal from '@/components/ReportModal'
import type { ChannelListDTO } from '@/lib/types'

interface PostAdminMenuProps {
  postId: string
  postChannelId: string
  isAdmin: boolean
  channels: ChannelListDTO[]
  onPostDeleted?: (postId: string) => void
  onChannelUpdated?: (channelId: string) => void
  onReported?: () => void
}

export default function PostAdminMenu({
  postId,
  postChannelId,
  isAdmin,
  channels,
  onPostDeleted,
  onChannelUpdated,
  onReported,
}: PostAdminMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
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
      onPostDeleted?.(postId)
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
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        itemType="post"
        itemId={postId}
        onReportSubmitted={onReported}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0"
        title="More options"
      >
        <MoreVertical size={16} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-background text-foreground border border-border rounded-md shadow-lg z-50 min-w-[220px]">
          {/* Report Button */}
          <button
            onClick={() => {
              setIsReportModalOpen(true)
              setIsOpen(false)
            }}
            className="block w-full text-left px-3 py-2 text-sm whitespace-nowrap text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 flex items-center gap-2"
          >
            <Flag size={14} />
            Report Post
          </button>

          {isAdmin && (
            <>
              {/* Divider */}
              <div className="border-t border-border" />

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
                      className={`block w-full text-left px-3 py-2 text-sm whitespace-nowrap hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed ${
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
                className="block w-full text-left px-3 py-2 text-sm whitespace-nowrap text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Post
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
