'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useNotificationCount } from '@/components/NotificationCountProvider'

export default function NotificationBell() {
  const { unreadCount } = useNotificationCount()

  return (
    <Link
      href="/dashboard/notifications"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
