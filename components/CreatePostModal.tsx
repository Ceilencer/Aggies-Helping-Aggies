'use client'

import Modal from '@/components/Modal'
import CreatePostForm from '@/components/CreatePostForm'
import { useToast } from '@/components/ui/toast'
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
  const { showToast, ToastContainer } = useToast()

  return (
    <>
      <ToastContainer />
      <Modal isOpen={isOpen} onClose={onClose} size="lg" contentClassName="px-6 py-4">
        <CreatePostForm
          initialChannelSlug={initialChannelSlug}
          onCancel={onClose}
          onPostCreated={(post, channel) => {
            showToast({
              message: post.approval_status === 'approved'
                ? 'Post published successfully.'
                : 'Post submitted. Waiting for admin approval.',
              type: 'info',
              positionClassName: 'top-24',
            })
            onPostCreated?.(post, channel)
            onClose()
          }}
        />
      </Modal>
    </>
  )
}
