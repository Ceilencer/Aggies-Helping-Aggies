import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const hasAdminSession = cookieStore.get('admin_session')?.value === 'true'

  // Check for either Supabase auth or admin session
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !hasAdminSession) {
    redirect('/login')
  }

  // Fetch profile if user is authenticated via Supabase
  let profile = null
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
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
    
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <nav className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="text-2xl">🎓</div>
            <span className="text-xl font-bold text-primary hidden sm:inline">
              Aggies Helping Aggies
            </span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground hidden md:inline">
              Welcome, {displayName}
            </span>

            <Link href="/dashboard/profile">
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>

            <Link href="/dashboard/admin">
              <Button variant="ghost" size="sm">
                Admin
              </Button>
            </Link>

            <form action={handleSignOut}>
              <Button variant="outline" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built with Gig 'em Spirit 🎓</p>
        </div>
      </footer>
    </div>
  )
}
