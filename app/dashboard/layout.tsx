import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import LeftSidebar from '@/components/LeftSidebar'
import { AdminCountProvider } from '@/components/AdminCountProvider'
import { RealtimeStatusProvider } from '@/lib/realtime/RealtimeStatusContext'
import { RealtimeStatusBanner } from '@/components/RealtimeStatusBanner'
import LegalModal from '@/components/LegalModalClient'
import { TERMS_SECTIONS, TERMS_EFFECTIVE_DATE } from '@/lib/legal/terms'
import { PRIVACY_SECTIONS, PRIVACY_EFFECTIVE_DATE } from '@/lib/legal/privacy'
import { getCachedAllChannels } from '@/lib/supabase/cached-queries'
import { sortChannelsByDisplayOrder } from '@/lib/utils'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Check whether the user actually submitted a verification request.
    // If they haven't (e.g. they abandoned the questionnaire mid-way), clear
    // their session so they aren't incorrectly shown the pending-approval page.
    const { data: existingVR } = await supabase
      .from('verification_requests')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingVR) {
      redirect('/auth/signout')
    }

    redirect('/pending-approval')
  }

  const displayName = profile.full_name || 'User'

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  const isAdmin = profile?.role === 'Admin'

  const allChannels = await getCachedAllChannels(supabase)
  const sidebarChannels = sortChannelsByDisplayOrder(
    allChannels.filter((c) => c.slug !== 'home')
  )

  return (
    <RealtimeStatusProvider>
    <AdminCountProvider isAdmin={isAdmin}>
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <Header
        displayName={displayName}
        avatarUrl={profile?.avatar_url ?? null}
        isAdmin={isAdmin}
        signOutAction={handleSignOut}
      />

      <RealtimeStatusBanner />

      {/* Main Content */}
      <main className="flex-1">
        <div className="flex">
          <div className="hidden lg:flex flex-1 justify-start pl-4">
            <LeftSidebar channels={sidebarChannels} isAdmin={isAdmin} />
          </div>
          <div className="w-full lg:max-w-2xl px-4 lg:px-0 py-8">
            {children}
          </div>
          <div className="hidden lg:block flex-1" />
        </div>
      </main>

      {/* Footer */}
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
    </AdminCountProvider>
    </RealtimeStatusProvider>
  )
}
