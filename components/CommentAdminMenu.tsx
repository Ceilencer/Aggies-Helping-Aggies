'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MoreVertical } from 'lucide-react'

interface CommentAdminMenuProps {
  commentId: string
  isAdmin: boolean
  onCommentDeleted?: (commentId: string) => void
}

export default function CommentAdminMenu({
  commentId,
  isAdmin,
  onCommentDeleted,
}: CommentAdminMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-6 w-6 p-0"
        title="Admin Options"
      >
        <MoreVertical size={14} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-950 border border-border rounded-md shadow-lg z-50 min-w-[120px]">
          {/* Delete Button */}
          <button
            onClick={handleDeleteComment}
            disabled={isDeleting}
            className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
