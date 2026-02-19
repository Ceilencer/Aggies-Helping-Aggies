'use client'

import Modal from '@/components/Modal'
import CreatePostForm from '@/components/CreatePostForm'
import type { Channel, Post } from '@/lib/types'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  initialChannelSlug?: string
  onPostCreated?: (post: Post, channel: Channel | null) => void
}

export default function CreatePostModal({
  isOpen,
  onClose,
  initialChannelSlug,
  onPostCreated,
}: CreatePostModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <CreatePostForm
        initialChannelSlug={initialChannelSlug}
        onCancel={onClose}
        onPostCreated={(post, channel) => {
          onPostCreated?.(post, channel)
          onClose()
        }}
      />
    </Modal>
  )
}
