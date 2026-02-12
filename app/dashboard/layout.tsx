import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from '@/components/UserMenu'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const hasAdminSession = cookieStore.get('admin_session')?.value === 'true'

  // Check for either Supabase auth or admin session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !hasAdminSession) {
    redirect('/')
  }

  // Fetch profile if user is authenticated via Supabase
  let profile = null
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_url')
      .eq('id', user.id)
      .single()
    profile = profileData
  }

  const displayName = profile?.full_name || 'Admin'

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    const cookieStore = await cookies()

    // Sign out from Supabase if authenticated
    await supabase.auth.signOut()

    // Clear admin session cookie
    cookieStore.delete('admin_session')

    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-header-bg shadow-sm">
        <nav className="container mx-auto flex items-center justify-between px-4 py-4">
          <Logo href="/dashboard" />
          
          <div className="flex items-center space-x-4">
            <UserMenu
              displayName={displayName}
              avatarUrl={profile?.avatar_url}
              isAdmin={profile?.role === 'Admin'}
              signOutAction={handleSignOut}
            />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-footer-bg py-8">
        <div className="container mx-auto px-4 text-center text-footer-text">
          <p className="mb-2">
            &copy; {new Date().getFullYear()} Aggies Helping Aggies. Built for Aggies by Aggies.
          </p>
          <p className="text-sm">
            This is an independent platform and is not officially affiliated with Texas A&M University.
          </p>
        </div>
      </footer>
    </div>
  )
}
