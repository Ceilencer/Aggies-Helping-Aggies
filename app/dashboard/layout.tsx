import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'
import { AdminCountProvider } from '@/components/AdminCountProvider'

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

  const displayName = profile?.full_name || 'User'

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  const isAdmin = profile?.role === 'Admin'

  return (
    <AdminCountProvider isAdmin={isAdmin}>
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <Header
        displayName={displayName}
        avatarUrl={profile?.avatar_url ?? null}
        isAdmin={isAdmin}
        signOutAction={handleSignOut}
      />

      {/* Main Content */}
      <main className="container mx-auto flex-1 px-4 py-8">
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
    </AdminCountProvider>
  )
}
