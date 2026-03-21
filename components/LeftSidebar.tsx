'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, FileText, User, Shield,
  MessagesSquare, Megaphone, Briefcase, Ticket, Bell,
} from 'lucide-react'
import type { Channel } from '@/lib/types'
import AggieRingIcon from '@/components/AggieRingIcon'
import { useNotificationCount } from '@/components/NotificationCountProvider'
import { useAdminCounts } from '@/components/AdminCountProvider'

interface LeftSidebarProps {
  channels: Channel[]
  isAdmin: boolean
}


function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function LeftSidebar({ channels, isAdmin }: LeftSidebarProps) {
  const pathname = usePathname()
  const { unreadCount } = useNotificationCount()
  const adminCounts = useAdminCounts()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors ${
      isActive(href)
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`

  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <div className="sidebar-scroll sticky top-[var(--header-h)] max-h-[calc(100vh-var(--header-h))] overflow-y-auto pt-6 space-y-5">

        <nav className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-2">
            Feed
          </p>
          <Link href="/dashboard" className={linkClass('/dashboard')}>
            <Home size={17} />
            Home
          </Link>

          {channels.map((channel) => {
            if (channel.slug === 'general') return (
              <Link key={channel.id} href={`/dashboard/channels/${channel.slug}`} className={linkClass(`/dashboard/channels/${channel.slug}`)}>
                <MessagesSquare size={17} />{channel.name}
              </Link>
            )
            if (channel.slug === 'promotions') return (
              <Link key={channel.id} href={`/dashboard/channels/${channel.slug}`} className={linkClass(`/dashboard/channels/${channel.slug}`)}>
                <Megaphone size={17} />{channel.name}
              </Link>
            )
            if (channel.slug === 'jobs') return (
              <Link key={channel.id} href={`/dashboard/channels/${channel.slug}`} className={linkClass(`/dashboard/channels/${channel.slug}`)}>
                <Briefcase size={17} />{channel.name}
              </Link>
            )
            if (channel.slug === 'tickets') return (
              <Link key={channel.id} href={`/dashboard/channels/${channel.slug}`} className={linkClass(`/dashboard/channels/${channel.slug}`)}>
                <Ticket size={17} />{channel.name}
              </Link>
            )
            if (channel.slug === 'aggie-ring') return (
              <Link key={channel.id} href={`/dashboard/channels/${channel.slug}`} className={linkClass(`/dashboard/channels/${channel.slug}`)}>
                <AggieRingIcon style={{ width: 17, height: 17 }} className="shrink-0" />{channel.name}
              </Link>
            )

            // Unknown channel — hide it
            return null
          })}
        </nav>

        <div className="border-t border-border pt-5 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-2">
            Account
          </p>
          <Link href="/dashboard/notifications" className={linkClass('/dashboard/notifications')}>
            <Bell size={17} />
            Notifications
            <Badge count={unreadCount} />
          </Link>
          <Link href="/dashboard/my-posts" className={linkClass('/dashboard/my-posts')}>
            <FileText size={17} />
            My Posts
          </Link>
          <Link href="/dashboard/profile" className={linkClass('/dashboard/profile')}>
            <User size={17} />
            Profile
          </Link>
          {isAdmin && (
            <Link href="/dashboard/admin" className={linkClass('/dashboard/admin')}>
              <Shield size={17} />
              Admin Panel
              <Badge count={adminCounts.total} />
            </Link>
          )}
        </div>

      </div>
    </aside>
  )
}
