'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'
import AnnouncementCard from '@/components/AnnouncementCard'
import ChannelAnnouncementModal from '@/components/ChannelAnnouncementModal'
import UserAvatar from '@/components/UserAvatar'
import { formatRelativeTime } from '@/lib/utils'
import type { ChannelAnnouncement } from '@/lib/types'

interface HomeAnnouncementSectionProps {
  announcement: ChannelAnnouncement | null
  onAnnouncementChange: (a: ChannelAnnouncement | null) => void
  profileId: string | undefined
  isAdmin: boolean
  isAgreementOpen: boolean
  /** Increment to imperatively open the popup (e.g. from a toast "View" button) */
  popupTrigger?: number
}

export default function HomeAnnouncementSection({
  announcement,
  onAnnouncementChange,
  profileId,
  isAdmin,
  isAgreementOpen,
  popupTrigger = 0,
}: HomeAnnouncementSectionProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)

  const markSeen = (updatedAt: string) => {
    if (typeof window === 'undefined' || !profileId) return
    window.localStorage.setItem(`home-announcement-seen-${profileId}`, updatedAt)
  }

  const dismiss = () => {
    if (announcement?.updated_at) markSeen(announcement.updated_at)
    setPopupOpen(false)
  }

  // Show popup on load/update if the user hasn't seen this version yet
  useEffect(() => {
    if (isAgreementOpen || !announcement?.updated_at || !profileId || typeof window === 'undefined') {
      setPopupOpen(false)
      return
    }
    const seenVersion = window.localStorage.getItem(`home-announcement-seen-${profileId}`)
    if (seenVersion !== announcement.updated_at) {
      setPopupOpen(true)
    }
  }, [announcement?.updated_at, isAgreementOpen, profileId])

  // External trigger: open popup on demand (e.g. from toast "View" button)
  useEffect(() => {
    if (popupTrigger > 0) setPopupOpen(true)
  }, [popupTrigger])

  return (
    <>
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setEditorOpen(true)}>
            {announcement ? 'Edit Announcement' : 'Post Announcement'}
          </Button>
        </div>
      )}

      {announcement && (
        <>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold text-page-heading-text">Announcement</h2>
          </div>
          <AnnouncementCard
            announcement={announcement}
            isAdmin={isAdmin}
            onEditClick={() => setEditorOpen(true)}
            onExpire={() => onAnnouncementChange(null)}
          />
        </>
      )}

      <ChannelAnnouncementModal
        isOpen={editorOpen}
        channelSlug="home"
        initialAnnouncement={announcement}
        onClose={() => setEditorOpen(false)}
        onSaved={(saved) => {
          markSeen(saved.updated_at)
          onAnnouncementChange(saved)
          setPopupOpen(false)
        }}
        onDeleted={() => {
          onAnnouncementChange(null)
          setPopupOpen(false)
        }}
      />

      <Modal
        isOpen={popupOpen}
        onClose={dismiss}
        title="Home Announcement"
        headerExtra={announcement?.updated_by_profile ? (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1">
            <UserAvatar user={announcement.updated_by_profile} size="sm" linkToProfile={false} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-card-header-text truncate leading-tight">
                {announcement.updated_by_profile.full_name}
              </p>
              <p className="text-[11px] text-card-subtext leading-tight" suppressHydrationWarning>
                Updated {formatRelativeTime(announcement.updated_at)}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-card-subtext leading-tight" suppressHydrationWarning>
            {announcement?.updated_at ? `Updated ${formatRelativeTime(announcement.updated_at)}` : ''}
          </span>
        )}
        size="md"
      >
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-card-header-text">{announcement?.title}</h2>
          <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {announcement?.content}
          </p>
          {isAdmin && announcement?.expires_at && (
            <p className="text-xs text-amber-600 dark:text-amber-400" suppressHydrationWarning>
              Expires {formatRelativeTime(announcement.expires_at)}
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={dismiss}>Close</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
