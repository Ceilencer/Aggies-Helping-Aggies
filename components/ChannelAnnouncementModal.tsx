'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ChannelAnnouncement } from '@/lib/types'

type ChannelAnnouncementModalProps = {
  isOpen: boolean
  channelSlug: string
  initialAnnouncement: ChannelAnnouncement | null
  onClose: () => void
  onSaved: (announcement: ChannelAnnouncement) => void
}

export default function ChannelAnnouncementModal({
  isOpen,
  channelSlug,
  initialAnnouncement,
  onClose,
  onSaved,
}: ChannelAnnouncementModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setTitle(initialAnnouncement?.title || '')
    setContent(initialAnnouncement?.content || '')
    setError('')
  }, [initialAnnouncement?.title, initialAnnouncement?.content, isOpen])

  const handleSave = async () => {
    setError('')

    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters.')
      return
    }

    if (content.trim().length < 10) {
      setError('Content must be at least 10 characters.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/channels/${channelSlug}/announcement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save channel announcement')
      }

      onSaved(data)
      onClose()
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save channel announcement')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={initialAnnouncement ? 'Edit Announcement' : 'Post Announcement'}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This announcement is scoped to the current channel and is published immediately.
        </p>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="announcement-title">Title</Label>
          <Input
            id="announcement-title"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Announcement title"
          />
          <p className="text-xs text-muted-foreground">{title.length}/200</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="announcement-content">Content</Label>
          <Textarea
            id="announcement-content"
            value={content}
            maxLength={5000}
            className="min-h-[180px]"
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share important updates for this channel"
          />
          <p className="text-xs text-muted-foreground">{content.length}/5000</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Announcement'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
