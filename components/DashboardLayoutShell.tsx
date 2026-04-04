'use client'

import Header from '@/components/Header'
import LeftSidebar from '@/components/LeftSidebar'
import { AdminCountProvider } from '@/components/AdminCountProvider'
import { RealtimeStatusProvider } from '@/lib/realtime/RealtimeStatusContext'
import { RealtimeStatusBanner } from '@/components/RealtimeStatusBanner'
import LegalModal from '@/components/LegalModalClient'
import { TERMS_SECTIONS, TERMS_EFFECTIVE_DATE } from '@/lib/legal/terms'
import { PRIVACY_SECTIONS, PRIVACY_EFFECTIVE_DATE } from '@/lib/legal/privacy'
import ContentWrapper from '@/components/ContentWrapper'
import { NotificationCountProvider } from '@/components/NotificationCountProvider'
import AuthGuard from '@/components/AuthGuard'
import MobileBottomNav from '@/components/MobileBottomNav'
import type { Channel } from '@/lib/types'

interface DashboardLayoutShellProps {
  children: React.ReactNode
  displayName: string
  avatarUrl: string | null
  isAdmin: boolean
  userId: string
  channels: Channel[]
  initialUnreadCount: number
  signOutAction: () => Promise<void>
}

export default function DashboardLayoutShell({
  children,
  displayName,
  avatarUrl,
  isAdmin,
  userId,
  channels,
  initialUnreadCount,
  signOutAction,
}: DashboardLayoutShellProps) {
  return (
    <RealtimeStatusProvider>
    <AdminCountProvider isAdmin={isAdmin}>
    <NotificationCountProvider userId={userId} initialUnreadCount={initialUnreadCount}>
    <AuthGuard userId={userId} />

    {/*
      h-[100dvh]: use the *dynamic* viewport height so iOS Safari's collapsing
      browser chrome is accounted for. The flex column means the bottom nav
      is a natural layout child — no position:fixed needed, so it never
      disappears during navigations or scroll repaints.
    */}
    <div className="flex-1 min-h-0 flex flex-col bg-background">

      <Header
        displayName={displayName}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        userId={userId}
        signOutAction={signOutAction}
      />

      <RealtimeStatusBanner />

      {/*
        Single scroll container spanning the full width — scrollbar appears on
        the far right edge of the viewport. The three-column flex row sits
        inside it; the sidebar uses sticky positioning within this container.
      */}
      <div id="main-scroll-container" className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex min-h-full">

          {/* Desktop sidebar */}
          <div className="hidden lg:flex flex-1 justify-start pl-4">
            <LeftSidebar channels={channels} isAdmin={isAdmin} />
          </div>

          {/* Main content + footer scroll together */}
          <main className="flex-1">
            <ContentWrapper>
              {children}
            </ContentWrapper>
          </main>

          <div className="hidden lg:block flex-1" />
        </div>

        {/* Footer inside the scroll area — visible only when scrolled to bottom */}
        <footer className="border-t bg-footer-bg py-8">
          <div className="container mx-auto px-4 text-center text-footer-text">
            <p className="mb-2">
              &copy; {new Date().getFullYear()} Aggies Helping Aggies. Built for Aggies by Aggies.
            </p>
            <p className="text-sm mb-3">
              This is an independent platform and is not officially affiliated with Texas A&M University.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <LegalModal title="Privacy Policy" effectiveDate={PRIVACY_EFFECTIVE_DATE} sections={PRIVACY_SECTIONS} />
              <span aria-hidden="true">&middot;</span>
              <LegalModal title="Terms and Conditions" effectiveDate={TERMS_EFFECTIVE_DATE} sections={TERMS_SECTIONS} />
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile bottom nav — flex-shrink-0 keeps it at a fixed height at the
          bottom of the column. No position:fixed = no iOS Safari flicker. */}
      <MobileBottomNav channels={channels} isAdmin={isAdmin} />

    </div>
    </NotificationCountProvider>
    </AdminCountProvider>
    </RealtimeStatusProvider>
  )
}
