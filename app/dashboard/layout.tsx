import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCachedAllChannels } from '@/lib/supabase/cached-queries'
import { sortChannelsByDisplayOrder } from '@/lib/utils'
import DashboardLayoutShell from '@/components/DashboardLayoutShell'

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
    .select('full_name, role, avatar_url, account_status')
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

  // Check if user is suspended or has active bans
  if (profile.account_status === 'suspended') {
    const { data: activeBans } = await supabase
      .from('user_bans')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (activeBans) {
      const expiresAt = activeBans.expires_at ? new Date(activeBans.expires_at) : null
      const now = new Date()

      const isStillActive = activeBans.ban_type === 'permanent' || (expiresAt && expiresAt > now)

      if (isStillActive) {
        redirect('/auth/signout?reason=suspended')
      } else if (expiresAt && expiresAt <= now) {
        // The temporary ban has expired — reactivate the account. These writes
        // touch privileged columns (account_status) that RLS forbids the user
        // from changing directly, so use the service-role client for this
        // trusted, server-controlled reactivation.
        const service = createServiceClient()
        await service
          .from('profiles')
          .update({ account_status: 'active' })
          .eq('id', user.id)

        await service
          .from('user_bans')
          .update({ is_active: false })
          .eq('id', activeBans.id)
      }
    }
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

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <DashboardLayoutShell
      displayName={displayName}
      avatarUrl={profile?.avatar_url ?? null}
      isAdmin={isAdmin}
      userId={user.id}
      channels={sidebarChannels}
      initialUnreadCount={unreadCount ?? 0}
      signOutAction={handleSignOut}
    >
      {children}
    </DashboardLayoutShell>
  )
}
