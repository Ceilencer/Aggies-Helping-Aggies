'use client'

import Modal from '@/components/Modal'
import PostDetailPanel from '@/components/PostDetailPanel'

interface PostDetailModalProps {
  isOpen: boolean
  postId: string | null
  onClose: () => void
  onPostDeleted?: (postId: string) => void
}

export default function PostDetailModal({
  isOpen,
  postId,
  onClose,
  onPostDeleted,
}: PostDetailModalProps) {
  if (!postId) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <PostDetailPanel
        postId={postId}
        onClose={onClose}
        onPostDeleted={onPostDeleted}
      />
    </Modal>
  )
}
