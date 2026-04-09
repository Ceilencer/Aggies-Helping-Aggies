'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import UserAvatar from '@/components/UserAvatar'
import { formatRelativeTime } from '@/lib/utils'
import type { ChannelAnnouncement } from '@/lib/types'

interface AnnouncementCardProps {
  announcement: ChannelAnnouncement
  isAdmin?: boolean
  onEditClick?: () => void
  onExpire?: () => void
}

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const msLeft = new Date(expiresAt).getTime() - Date.now()
    if (msLeft <= 0) return
    // In seconds mode tick every 1s; in minutes mode sync to the next minute
    // boundary so display updates correctly and we transition to seconds at exactly 60s.
    const delay = msLeft <= 60000 ? 1000 : (msLeft % 60000) || 60000
    const timer = setTimeout(() => setNow(Date.now()), delay)
    return () => clearTimeout(timer)
  }, [expiresAt, now])

  const msLeft = new Date(expiresAt).getTime() - now
  if (msLeft <= 0) return null

  const hoursLeft = msLeft / (1000 * 60 * 60)
  const colorClass = hoursLeft < 24
    ? 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400'
    : hoursLeft < 24 * 7
    ? 'border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400'
    : 'border-border text-muted-foreground'

  const secsLeft = Math.ceil(msLeft / 1000)
  const label = secsLeft <= 60
    ? `Expires in ${secsLeft}s`
    : `Expires in ${Math.ceil(secsLeft / 60)}m`

  return (
    <span className={`rounded border px-2 py-0.5 text-xs ${colorClass}`} suppressHydrationWarning>
      {label}
    </span>
  )
}

export default function AnnouncementCard({ announcement, isAdmin, onEditClick, onExpire }: AnnouncementCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hidden, setHidden] = useState(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (!announcement.expires_at) return
    const msLeft = new Date(announcement.expires_at).getTime() - Date.now()
    if (msLeft <= 0) {
      setHidden(true)
      onExpireRef.current?.()
      return
    }
    const timer = setTimeout(() => {
      setHidden(true)
      onExpireRef.current?.()
    }, msLeft)
    return () => clearTimeout(timer)
  }, [announcement.expires_at])

  if (hidden) return null

  return (
    <Card className="bg-pinned-announcement-bg/5 border-pinned-announcement-border dark:bg-pinned-announcement-bg/20 dark:border-pinned-announcement-border-dark rounded-none border-x-0 shadow-none sm:rounded-lg sm:border sm:border-l-4 sm:shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Author + timestamp */}
          <div className="flex items-center gap-3 min-w-0">
            {announcement.updated_by_profile ? (
              <>
                <UserAvatar user={announcement.updated_by_profile} size="sm" linkToProfile={false} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-card-header-text truncate">
                    {announcement.updated_by_profile.full_name}
                  </p>
                  <p className="text-xs text-card-subtext" suppressHydrationWarning>
                    Updated {formatRelativeTime(announcement.updated_at)}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-xs text-card-subtext" suppressHydrationWarning>
                Updated {formatRelativeTime(announcement.updated_at)}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && announcement.expires_at && <ExpiryBadge expiresAt={announcement.expires_at} />}
            {isAdmin && onEditClick && (
              <Button size="sm" variant="ghost" onClick={onEditClick} className="h-7 px-2 text-xs">
                Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCollapsed((c) => !c)}
              className="h-7 px-2 text-xs text-muted-foreground"
            >
              {isCollapsed ? 'Show ▾' : 'Hide ▴'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent>
          <h2 className="text-xl font-bold text-card-header-text mb-2">{announcement.title}</h2>
          <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {announcement.content}
          </p>
        </CardContent>
      )}

      {isCollapsed && (
        <CardContent className="pt-0 pb-3">
          <p className="text-sm font-semibold text-card-header-text truncate">{announcement.title}</p>
        </CardContent>
      )}
    </Card>
  )
}
