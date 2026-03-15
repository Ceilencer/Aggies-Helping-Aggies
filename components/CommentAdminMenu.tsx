'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MoreVertical, Flag } from 'lucide-react'
import ReportModal from '@/components/ReportModal'

interface CommentAdminMenuProps {
  commentId: string
  isAdmin: boolean
  onCommentDeleted?: (commentId: string) => void
  onReported?: () => void
}

export default function CommentAdminMenu({
  commentId,
  isAdmin,
  onCommentDeleted,
  onReported,
}: CommentAdminMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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

  const handleDeleteComment = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/comments/${commentId}/admin-delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete comment')
      }

      setIsOpen(false)
      onCommentDeleted?.(commentId)
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        itemType="comment"
        itemId={commentId}
        onReportSubmitted={onReported}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-6 w-6 p-0"
        title="More options"
      >
        <MoreVertical size={14} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-950 border border-border rounded-md shadow-lg z-50 min-w-[120px]">
          {/* Report Button */}
          <button
            onClick={() => {
              setIsReportModalOpen(true)
              setIsOpen(false)
            }}
            className="block w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 flex items-center gap-2"
          >
            <Flag size={14} />
            Report
          </button>

          {isAdmin && (
            <>
              {/* Divider */}
              <div className="border-t border-border" />

              {/* Delete Button */}
              <button
                onClick={handleDeleteComment}
                disabled={isDeleting}
                className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
