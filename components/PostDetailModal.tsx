'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import PostDetailPanel from '@/components/PostDetailPanel'

interface PostDetailModalProps {
  isOpen: boolean
  postId: string | null
  onClose: () => void
  onPostDeleted?: (postId: string) => void
  onProfileClick?: (userId: string) => void
  onPostLikeChange?: (postId: string, likeCount: number, userHasLiked: boolean) => void
  onPostCommentChange?: (postId: string, commentCount: number) => void
}

export default function PostDetailModal({
  isOpen,
  postId,
  onClose,
  onPostDeleted,
  onProfileClick,
  onPostLikeChange,
  onPostCommentChange,
}: PostDetailModalProps) {
  const [modalTitle, setModalTitle] = useState<string>('')

  if (!postId) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={modalTitle || undefined} contentClassName="">
      <PostDetailPanel
        postId={postId}
        onClose={onClose}
        onPostDeleted={onPostDeleted}
        onProfileClick={onProfileClick}
        onPostLikeChange={onPostLikeChange}
        onPostCommentChange={onPostCommentChange}
        onTitleChange={setModalTitle}
      />
    </Modal>
  )
}
