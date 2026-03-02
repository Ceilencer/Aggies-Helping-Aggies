'use client'

import Modal from '@/components/Modal'
import UserProfilePanel from '@/components/UserProfilePanel'

interface UserProfileModalProps {
  isOpen: boolean
  userId: string | null
  onClose: () => void
  onDeleted?: () => void
}

export default function UserProfileModal({
  isOpen,
  userId,
  onClose,
  onDeleted,
}: UserProfileModalProps) {
  if (!userId) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <UserProfilePanel userId={userId} onClose={onClose} onDeleted={onDeleted ?? onClose} />
    </Modal>
  )
}
