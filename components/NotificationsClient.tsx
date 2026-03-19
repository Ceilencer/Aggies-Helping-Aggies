'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const TYPE_STYLES: Record<string, { dot: string }> = {
  post_approved: { dot: 'bg-green-500' },
  post_rejected: { dot: 'bg-red-500' },
  edit_approved: { dot: 'bg-blue-500' },
  edit_rejected: { dot: 'bg-orange-500' },
}

function getTypeDot(type: string) {
  return TYPE_STYLES[type]?.dot ?? 'bg-muted-foreground'
}

export default function NotificationsClient({
  userId,
  initialNotifications,
}: {
  userId: string
  initialNotifications: Notification[]
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [markingAll, setMarkingAll] = useState(false)
  const router = useRouter()

  const unreadCount = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications-inbox-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [userId])

  async function markOneRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
  }

  async function markAllRead() {
    setMarkingAll(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await fetch('/api/notifications', { method: 'PATCH' })
    setMarkingAll(false)
  }

  async function handleClick(n: Notification) {
    if (!n.is_read) await markOneRead(n.id)
    if (n.link) router.push(n.link)
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
        <Bell className="h-10 w-10 opacity-30" />
        <p className="text-sm">No notifications yet</p>
      </div>
    )
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left rounded-lg border px-4 py-3 transition-colors hover:bg-muted/60 ${
              n.is_read ? 'border-border bg-background opacity-70' : 'border-border bg-card'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : getTypeDot(n.type)}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${n.is_read ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {n.title}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {timeAgo(n.created_at)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
