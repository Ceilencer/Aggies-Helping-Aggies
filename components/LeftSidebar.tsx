'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, FileText, User, Shield,
  MessagesSquare, Megaphone, Briefcase, Ticket, Bell, Building2,
  ArrowLeft, Flag, UserPlus, Users, UserX, UserCog, BarChart2,
} from 'lucide-react'
import type { Channel } from '@/lib/types'
import { useNotificationCount } from '@/components/NotificationCountProvider'
import { useAdminCounts } from '@/components/AdminCountProvider'
import AggieRingIcon from '@/components/AggieRingIcon'

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
    if (href === '/dashboard' || href === '/dashboard/admin') return pathname === href
    return pathname.startsWith(href)
  }

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors ${
      isActive(href)
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`

  const isAdminArea = pathname.startsWith('/dashboard/admin')

  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <div className="sidebar-scroll sticky top-0 max-h-screen overflow-y-auto pt-6 space-y-5">

        {isAdminArea ? (
          <>
            {/* Back link */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={15} />
              Back to Dashboard
            </Link>

            {/* Content */}
            <nav className="border-t border-border pt-5 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-2">
                Content
              </p>
              <Link href="/dashboard/admin" className={linkClass('/dashboard/admin')}>
                <FileText size={17} />
                Pending Posts
                <Badge count={adminCounts.pendingPosts} />
              </Link>
              <Link href="/dashboard/admin/reported-posts" className={linkClass('/dashboard/admin/reported-posts')}>
                <Flag size={17} />
                Reported Posts
                <Badge count={adminCounts.unresolvedReports} />
              </Link>
            </nav>

            {/* Users */}
            <nav className="border-t border-border pt-5 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-2">
                Users
              </p>
              <Link href="/dashboard/admin/pending-verifications" className={linkClass('/dashboard/admin/pending-verifications')}>
                <UserPlus size={17} />
                New Users
                <Badge count={adminCounts.pendingUsers} />
              </Link>
              <Link href="/dashboard/admin/users" className={linkClass('/dashboard/admin/users')}>
                <Users size={17} />
                User Management
              </Link>
              <Link href="/dashboard/admin/suspended-users" className={linkClass('/dashboard/admin/suspended-users')}>
                <UserX size={17} />
                Suspended Users
              </Link>
              <Link href="/dashboard/admin/name-change-requests" className={linkClass('/dashboard/admin/name-change-requests')}>
                <UserCog size={17} />
                Name Changes
                <Badge count={adminCounts.pendingNameChanges} />
              </Link>
            </nav>

            {/* Fundraising */}
            <nav className="border-t border-border pt-5 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-2">
                Fundraising
              </p>
              <Link href="/dashboard/admin/ring-sponsorship" className={linkClass('/dashboard/admin/ring-sponsorship')}>
                <AggieRingIcon className="shrink-0" style={{ width: 17, height: 17 }} />
                Ring Sponsorship
                <Badge count={adminCounts.pendingRingApplications} />
              </Link>
            </nav>

            {/* Insights */}
            <nav className="border-t border-border pt-5 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-2">
                Insights
              </p>
              <Link href="/dashboard/admin/analytics" className={linkClass('/dashboard/admin/analytics')}>
                <BarChart2 size={17} />
                Analytics
              </Link>
            </nav>
          </>
        ) : (
          <>
            {/* Important Pages */}
            <nav className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pb-2">
                Important Pages
              </p>
              <Link href="/dashboard/fundraising" className={linkClass('/dashboard/fundraising')}>
                <AggieRingIcon className="shrink-0" style={{ width: 17, height: 17 }} />
                Fundraising Info
              </Link>
            </nav>

            {/* Feed */}
            <nav className="border-t border-border pt-5 space-y-1">
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
                if (channel.slug === 'housing') return (
                  <Link key={channel.id} href={`/dashboard/channels/${channel.slug}`} className={linkClass(`/dashboard/channels/${channel.slug}`)}>
                    <Building2 size={17} />{channel.name}
                  </Link>
                )
                return null
              })}
            </nav>

            {/* Account */}
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
          </>
        )}

      </div>
    </aside>
  )
}
