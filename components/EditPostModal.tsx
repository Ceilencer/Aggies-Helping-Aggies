'use client'

import Modal from '@/components/Modal'
import EditPostForm from '@/components/EditPostForm'
import type { Channel, ChannelListDTO, Post } from '@/lib/types'

type EditablePost = Pick<Post, 'id' | 'title' | 'content' | 'images'>

interface EditPostModalProps {
  isOpen: boolean
  onClose: () => void
  post: EditablePost
  channel?: Channel | ChannelListDTO
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
