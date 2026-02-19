'use client'

import Modal from '@/components/Modal'
import EditPostForm from '@/components/EditPostForm'
import type { Channel, Post } from '@/lib/types'

interface EditPostModalProps {
  isOpen: boolean
  onClose: () => void
  post: Post
  channel?: Channel
  onPostUpdated?: (post: Post) => void
}

export default function EditPostModal({
  isOpen,
  onClose,
  post,
  channel,
  onPostUpdated,
}: EditPostModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <EditPostForm
        post={post}
        channel={channel}
        onCancel={onClose}
        onPostUpdated={(updatedPost) => {
          onPostUpdated?.(updatedPost)
          onClose()
        }}
      />
    </Modal>
  )
}
