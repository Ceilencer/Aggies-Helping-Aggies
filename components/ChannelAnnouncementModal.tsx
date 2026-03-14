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
  onDeleted?: () => void
}

/** Convert a UTC ISO string to the value format required by datetime-local inputs */
function toDatetimeLocalValue(isoString: string): string {
  const date = new Date(isoString)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

/** Minimum value for datetime-local: 5 minutes from now */
function minDatetimeLocalValue(): string {
  return toDatetimeLocalValue(new Date(Date.now() + 5 * 60 * 1000).toISOString())
}

export default function ChannelAnnouncementModal({
  isOpen,
  channelSlug,
  initialAnnouncement,
  onClose,
  onSaved,
  onDeleted,
}: ChannelAnnouncementModalProps) {
  const [step, setStep] = useState<'edit' | 'preview'>('edit')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [expiresAt, setExpiresAt] = useState<string>('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setStep('edit')
    setTitle(initialAnnouncement?.title || '')
    setContent(initialAnnouncement?.content || '')
    setExpiresAt(
      initialAnnouncement?.expires_at
        ? toDatetimeLocalValue(initialAnnouncement.expires_at)
        : ''
    )
    setError('')
    setConfirmingDelete(false)
  }, [initialAnnouncement?.title, initialAnnouncement?.content, initialAnnouncement?.expires_at, isOpen])

  const validate = (): boolean => {
    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters.')
      return false
    }
    if (content.trim().length < 10) {
      setError('Content must be at least 10 characters.')
      return false
    }
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      setError('Expiry must be in the future.')
      return false
    }
    return true
  }

  const handlePreview = () => {
    setError('')
    if (!validate()) return
    setStep('preview')
  }

  const handlePublish = async () => {
    setError('')
    setIsSaving(true)
    try {
      const response = await fetch(`/api/channels/${channelSlug}/announcement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
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
      setStep('edit')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/channels/${channelSlug}/announcement`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to remove announcement')
      }
      onDeleted?.()
      onClose()
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Failed to remove announcement')
      setConfirmingDelete(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const modalTitle = step === 'preview'
    ? 'Preview Announcement'
    : initialAnnouncement ? 'Edit Announcement' : 'Post Announcement'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={modalTitle}>
      {step === 'edit' ? (
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
              onChange={(e) => setTitle(e.target.value)}
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
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share important updates for this channel"
            />
            <p className="text-xs text-muted-foreground">{content.length}/5000</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement-expires">Auto-expire on (optional)</Label>
            <input
              id="announcement-expires"
              type="datetime-local"
              value={expiresAt}
              min={minDatetimeLocalValue()}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-xs text-muted-foreground">
              If set, the announcement will be hidden automatically after this date and time.
            </p>
            {expiresAt && (
              <button
                type="button"
                onClick={() => setExpiresAt('')}
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Clear expiry
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            {/* Delete zone */}
            <div>
              {initialAnnouncement && onDeleted && (
                confirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">Remove this announcement?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleDelete()}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Removing…' : 'Yes, remove'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Clear Announcement
                  </Button>
                )
              )}
            </div>

            {/* Save zone */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handlePreview}>
                Preview →
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Preview step */
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This is how the announcement will appear. Click <strong>Publish</strong> to make it live.
          </p>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-lg border-l-4 border-pinned-announcement-border bg-pinned-announcement-bg/5 p-4 dark:bg-pinned-announcement-bg/20 dark:border-pinned-announcement-border-dark space-y-3">
            <h2 className="text-xl font-bold text-card-header-text">{title}</h2>
            <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {content}
            </p>
            {expiresAt && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Expires {new Date(expiresAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex justify-between gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setStep('edit')} disabled={isSaving}>
              ← Back to Edit
            </Button>
            <Button onClick={() => void handlePublish()} disabled={isSaving}>
              {isSaving ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
