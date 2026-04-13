'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Flag, History } from 'lucide-react'
import ReportModal from '@/components/ReportModal'
import Modal from '@/components/Modal'
import PostHistory from '@/components/PostHistory'
import type { ChannelListDTO } from '@/lib/types'
import ChannelIcon from '@/components/ChannelIcon'

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
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

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

      onPostDeleted?.(postId)
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleChangeChannel = async (channelId: string) => {
    if (channelId === postChannelId) return

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

      onChannelUpdated?.(channelId)
    } catch (error) {
      console.error('Error changing channel:', error)
      alert('Failed to change channel')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        itemType="post"
        itemId={postId}
        onReportSubmitted={onReported}
      />

      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Post History"
        size="md"
      >
        <PostHistory postId={postId} />
      </Modal>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="More options"
          >
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[220px]">
          {/* Report Post */}
          <DropdownMenuItem
            onSelect={() => setIsReportModalOpen(true)}
            className="text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-950/30 gap-2"
          >
            <Flag size={14} />
            Report Post
          </DropdownMenuItem>

          {/* Admin-only section */}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />

              {/* Move to Channel */}
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                Move to Channel
              </DropdownMenuLabel>

              <div className="max-h-48 overflow-y-auto">
                {channels
                  .filter((c) => c.id !== postChannelId && c.slug !== 'announcements' && c.slug !== 'home')
                  .map((channel) => (
                    <DropdownMenuItem
                      key={channel.id}
                      onSelect={() => handleChangeChannel(channel.id)}
                      disabled={isUpdating}
                      className="gap-2"
                    >
                      <ChannelIcon slug={channel.slug} size={14} className="shrink-0" />
                      {channel.name}
                    </DropdownMenuItem>
                  ))}
              </div>

              <DropdownMenuSeparator />

              {/* View History */}
              <DropdownMenuItem
                onSelect={() => setIsHistoryOpen(true)}
                className="gap-2"
              >
                <History size={14} />
                View History
              </DropdownMenuItem>

              {/* Delete Post */}
              <DropdownMenuItem
                onSelect={handleDeletePost}
                disabled={isDeleting}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
              >
                {isDeleting ? 'Deleting…' : 'Delete Post'}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
