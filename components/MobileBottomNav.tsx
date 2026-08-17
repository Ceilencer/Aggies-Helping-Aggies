'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, MessagesSquare, Briefcase, Megaphone,
  Building2, Ticket, Bell, FileText, User,
  Shield, Flag, UserPlus, Users, UserX, UserCog, BarChart2,
} from 'lucide-react'
import type { Channel } from '@/lib/types'
import { useNotificationCount } from '@/components/NotificationCountProvider'
import { useAdminCounts } from '@/components/AdminCountProvider'
import AggieRingIcon from '@/components/AggieRingIcon'

interface MobileBottomNavProps {
  channels: Channel[]
  isAdmin: boolean
}

// Used on bottom-bar icons (absolute positioned dot)
function Badge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

// Used inside drawer links (inline pill, pushed to the right with ml-auto)
function InlineBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

const CHANNEL_ICON_MAP: Record<string, React.ElementType> = {
  general: MessagesSquare,
  housing: Building2,
  jobs: Briefcase,
  promotions: Megaphone,
  tickets: Ticket,
}

// Only show these channels in the mobile nav (mirrors LeftSidebar whitelist)
const ALLOWED_CHANNEL_SLUGS = new Set(['general', 'housing', 'jobs', 'promotions', 'tickets'])

type DrawerType = 'channels' | 'account' | 'admin' | null

export default function MobileBottomNav({ channels, isAdmin }: MobileBottomNavProps) {
  const pathname = usePathname()
  const { unreadCount } = useNotificationCount()
  const adminCounts = useAdminCounts()
  const [openDrawer, setOpenDrawer] = useState<DrawerType>(null)

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/dashboard/admin') return pathname === href
    return pathname.startsWith(href)
  }

  const isAdminArea = pathname.startsWith('/dashboard/admin')
  const isRingActive = pathname.startsWith('/dashboard/fundraising')

  const toggleDrawer = (type: DrawerType) => {
    setOpenDrawer(prev => prev === type ? null : type)
  }

  const closeDrawer = () => setOpenDrawer(null)

  // Lock the main scroll container while any drawer is open
  useEffect(() => {
    const el = document.getElementById('main-scroll-container')
    if (!el) return
    el.style.overflow = openDrawer !== null ? 'hidden' : ''
    return () => { el.style.overflow = '' }
  }, [openDrawer])

  const accountBadgeCount = unreadCount

  const navItemClass = (active: boolean) =>
    `relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors ${
      active ? 'text-white' : 'text-white/50 hover:text-white/80'
    }`

  const drawerLinkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium transition-colors ${
      isActive(href)
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`

  const channelsActive = openDrawer === 'channels' || channels.some(c => isActive(`/dashboard/channels/${c.slug}`))
  const accountActive = openDrawer === 'account' || isActive('/dashboard/notifications') || isActive('/dashboard/my-posts') || isActive('/dashboard/profile')

  return (
    <>
      {/* Bottom navigation bar — not position:fixed; it's a natural flex child of the
          100dvh layout column so iOS Safari can never lose it during navigation. */}
      <nav className="lg:hidden flex h-16 w-full flex-shrink-0 items-stretch border-t border-white/10 bg-header-bg">

        {/* Home */}
        <Link href="/dashboard" className={navItemClass(isActive('/dashboard'))} onClick={closeDrawer}>
          <span className="relative">
            <Home className="h-5 w-5" />
          </span>
          <span>Home</span>
        </Link>

        {/* Channels */}
        <button
          type="button"
          onClick={() => toggleDrawer('channels')}
          className={navItemClass(channelsActive)}
          aria-label="Channels"
        >
          <span className="relative">
            <MessagesSquare className="h-5 w-5" />
          </span>
          <span>Channels</span>
        </button>

        {/* Ring Page */}
        <Link href="/dashboard/fundraising" className={navItemClass(isRingActive)} onClick={closeDrawer}>
          <span className="relative">
            <AggieRingIcon style={{ width: 20, height: 20 }} />
          </span>
          <span>Ring</span>
        </Link>

        {/* Account */}
        <button
          type="button"
          onClick={() => toggleDrawer('account')}
          className={navItemClass(accountActive)}
          aria-label="Account"
        >
          <span className="relative">
            <User className="h-5 w-5" />
            {openDrawer !== 'account' && accountBadgeCount > 0 && <Badge count={accountBadgeCount} />}
          </span>
          <span>Account</span>
        </button>

        {/* Admin — only visible to admins */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => toggleDrawer('admin')}
            className={navItemClass(openDrawer === 'admin' || isAdminArea)}
            aria-label="Admin panel"
          >
            <span className="relative">
              <Shield className="h-5 w-5" />
              {openDrawer !== 'admin' && adminCounts.total > 0 && <Badge count={adminCounts.total} />}
            </span>
            <span>Admin</span>
          </button>
        )}

      </nav>

      {/* Slide-up drawer */}
      {openDrawer !== null && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div className="lg:hidden fixed bottom-16 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-background shadow-xl">
            <div className="flex items-center justify-center px-4 pt-4 pb-2">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-3 pb-6 space-y-5">

              {/* ── CHANNELS DRAWER ── */}
              {openDrawer === 'channels' && (
                <nav className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pb-2">Channels</p>
                  {channels
                    .filter(c => ALLOWED_CHANNEL_SLUGS.has(c.slug))
                    .map(channel => {
                      const Icon = CHANNEL_ICON_MAP[channel.slug] ?? MessagesSquare
                      const href = `/dashboard/channels/${channel.slug}`
                      return (
                        <Link key={channel.id} href={href} className={drawerLinkClass(href)} onClick={closeDrawer}>
                          <Icon size={17} />{channel.name}
                        </Link>
                      )
                    })}
                </nav>
              )}

              {/* ── ACCOUNT DRAWER ── */}
              {openDrawer === 'account' && (
                <>
                  <nav className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pb-2">Account</p>
                    <Link href="/dashboard/notifications" className={drawerLinkClass('/dashboard/notifications')} onClick={closeDrawer}>
                      <Bell size={17} />Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/dashboard/my-posts" className={drawerLinkClass('/dashboard/my-posts')} onClick={closeDrawer}>
                      <FileText size={17} />My Posts
                    </Link>
                    <Link href="/dashboard/profile" className={drawerLinkClass('/dashboard/profile')} onClick={closeDrawer}>
                      <User size={17} />Profile
                    </Link>
                  </nav>
                </>
              )}

              {/* ── ADMIN DRAWER ── */}
              {openDrawer === 'admin' && (
                <>
                  <nav className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pb-2">Content</p>
                    <Link href="/dashboard/admin" className={drawerLinkClass('/dashboard/admin')} onClick={closeDrawer}>
                      <FileText size={17} />Pending Posts
                      {adminCounts.pendingPosts > 0 && <InlineBadge count={adminCounts.pendingPosts} />}
                    </Link>
                    <Link href="/dashboard/admin/reported-posts" className={drawerLinkClass('/dashboard/admin/reported-posts')} onClick={closeDrawer}>
                      <Flag size={17} />Reported Posts
                      {adminCounts.unresolvedReports > 0 && <InlineBadge count={adminCounts.unresolvedReports} />}
                    </Link>
                  </nav>

                  <nav className="border-t border-border pt-4 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pb-2">Users</p>
                    <Link href="/dashboard/admin/pending-verifications" className={drawerLinkClass('/dashboard/admin/pending-verifications')} onClick={closeDrawer}>
                      <UserPlus size={17} />New Users
                      {adminCounts.pendingUsers > 0 && <InlineBadge count={adminCounts.pendingUsers} />}
                    </Link>
                    <Link href="/dashboard/admin/users" className={drawerLinkClass('/dashboard/admin/users')} onClick={closeDrawer}>
                      <Users size={17} />User Management
                    </Link>
                    <Link href="/dashboard/admin/suspended-users" className={drawerLinkClass('/dashboard/admin/suspended-users')} onClick={closeDrawer}>
                      <UserX size={17} />Suspended Users
                    </Link>
                    <Link href="/dashboard/admin/name-change-requests" className={drawerLinkClass('/dashboard/admin/name-change-requests')} onClick={closeDrawer}>
                      <UserCog size={17} />Name Changes
                      {adminCounts.pendingNameChanges > 0 && <InlineBadge count={adminCounts.pendingNameChanges} />}
                    </Link>
                  </nav>

                  <nav className="border-t border-border pt-4 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pb-2">Fundraising</p>
                    <Link href="/dashboard/admin/ring-sponsorship" className={drawerLinkClass('/dashboard/admin/ring-sponsorship')} onClick={closeDrawer}>
                      <AggieRingIcon className="shrink-0" style={{ width: 17, height: 17 }} />Ring Sponsorship
                    </Link>
                  </nav>

                  <nav className="border-t border-border pt-4 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pb-2">Insights</p>
                    <Link href="/dashboard/admin/analytics" className={drawerLinkClass('/dashboard/admin/analytics')} onClick={closeDrawer}>
                      <BarChart2 size={17} />Analytics
                    </Link>
                  </nav>
                </>
              )}

            </div>
          </div>
        </>
      )}
    </>
  )
}
