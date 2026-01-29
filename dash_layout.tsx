import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.is_verified) {
    redirect('/verification-pending')
  }

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <nav className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="text-2xl">🎓</div>
            <span className="text-xl font-bold text-maroon hidden sm:inline">
              Aggies Helping Aggies
            </span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden md:inline">
              Welcome, {profile?.full_name}
            </span>
            
            <Link href="/dashboard/profile">
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>
            
            {profile?.role === 'Admin' && (
              <Link href="/dashboard/admin">
                <Button variant="ghost" size="sm" className="text-maroon">
                  Admin
                </Button>
              </Link>
            )}
            
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
      <footer className="border-t bg-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>Built with Gig 'em Spirit 🎓</p>
        </div>
      </footer>
    </div>
  )
}
