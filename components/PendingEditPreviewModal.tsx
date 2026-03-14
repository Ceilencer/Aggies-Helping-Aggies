'use client'

import Modal from '@/components/Modal'
import { Button } from '@/components/ui/button'
import type { FeedPost } from '@/lib/types'

interface PendingEditPreviewModalProps {
  post: FeedPost | undefined
  onClose: () => void
}

export default function PendingEditPreviewModal({ post, onClose }: PendingEditPreviewModalProps) {
  return (
    <Modal
      isOpen={!!post}
      onClose={onClose}
      title="Your Pending Edit"
      size="md"
    >
      {post?.pending_edit ? (
        <div className="space-y-6 p-6">
          <p className="text-sm text-muted-foreground">
            This edit is currently under admin review. The changes below will go live if approved.
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Proposed Title
              </p>
              <p className="font-semibold text-card-header-text">{post.pending_edit.proposed_title}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Proposed Content
              </p>
              <p className="text-sm text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {post.pending_edit.proposed_content}
              </p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Current post</span> remains visible to other users until this edit is approved.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <p className="p-6 text-sm text-muted-foreground">No pending edit data available.</p>
      )}
    </Modal>
  )
}
