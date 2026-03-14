'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Modal from '@/components/Modal'
import ChannelAnnouncementModal from '@/components/ChannelAnnouncementModal'
import UserAvatar from '@/components/UserAvatar'
import { formatRelativeTime } from '@/lib/utils'
import type { ChannelAnnouncement } from '@/lib/types'

interface HomeAnnouncementSectionProps {
  initialAnnouncement: ChannelAnnouncement | null
  profileId: string | undefined
  isAdmin: boolean
  isAgreementOpen: boolean
}

export default function HomeAnnouncementSection({
  initialAnnouncement,
  profileId,
  isAdmin,
  isAgreementOpen,
}: HomeAnnouncementSectionProps) {
  const [announcement, setAnnouncement] = useState<ChannelAnnouncement | null>(initialAnnouncement)
  const [editorOpen, setEditorOpen] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)

  const markSeen = (updatedAt: string) => {
    if (typeof window === 'undefined' || !profileId) return
    window.localStorage.setItem(`home-announcement-seen-${profileId}`, updatedAt)
  }

  const dismiss = () => {
    if (announcement?.updated_at) {
      markSeen(announcement.updated_at)
    }
    setPopupOpen(false)
  }

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
          <Card className="bg-pinned-announcement-bg/5 border-l-4 border-pinned-announcement-border dark:bg-pinned-announcement-bg/20 dark:border-l-4 dark:border-pinned-announcement-border-dark">
            <CardHeader>
              <div className="flex items-center gap-3 min-w-0">
                {announcement.updated_by_profile ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar user={announcement.updated_by_profile} size="sm" linkToProfile={false} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-card-header-text truncate">
                        {announcement.updated_by_profile.full_name}
                      </p>
                      <p className="text-xs text-card-subtext">Updated {formatRelativeTime(announcement.updated_at)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-card-subtext">Updated {formatRelativeTime(announcement.updated_at)}</p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <h2 className="text-xl font-bold text-card-header-text mb-2">{announcement.title}</h2>
              <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {announcement.content}
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <ChannelAnnouncementModal
        isOpen={editorOpen}
        channelSlug="home"
        initialAnnouncement={announcement}
        onClose={() => setEditorOpen(false)}
        onSaved={(saved) => {
          markSeen(saved.updated_at)
          setAnnouncement(saved)
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
              <p className="text-[11px] text-card-subtext leading-tight">
                Updated {formatRelativeTime(announcement.updated_at)}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-card-subtext leading-tight">
            Updated {formatRelativeTime(announcement?.updated_at || '')}
          </span>
        )}
        size="md"
      >
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-card-header-text">{announcement?.title}</h2>
          <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {announcement?.content}
          </p>
          <div className="flex justify-end">
            <Button onClick={dismiss}>Close</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
