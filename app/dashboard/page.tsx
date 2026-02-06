import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()

  // Check for temporary admin session (for local testing)
  const hasAdminSession = cookieStore.get('admin_session')?.value === 'true'

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated (either via Supabase or temp session)
  if (!user && !hasAdminSession) {
    redirect('/login')
  }

  // Use mock data for local testing when using admin session
  let profile = null
  let channels = null
  let posts = null
  let announcements = null

  if (user) {
    // Real Supabase authentication - fetch from database
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = profileData

    const { data: channelsData } = await supabase
      .from('channels')
      .select('*')
      .order('name')
    channels = channelsData

    // Get the announcements channel ID first
    const { data: announcementChannel } = await supabase
      .from('channels')
      .select('id')
      .eq('slug', 'announcements')
      .single()

    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(*),
        channel:channels!inner(*)
      `)
      .neq('channel_id', announcementChannel?.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (postsError) {
      console.error('Error loading posts:', postsError)
    } else {
      console.log('Loaded posts (non-announcements):', postsData?.map(p => ({
        title: p.title,
        channel: p.channel?.name,
        channel_slug: p.channel?.slug
      })))
    }
    posts = postsData

    const { data: announcementsData, error: announcementsError } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(*),
        channel:channels!inner(*)
      `)
      .eq('channel_id', announcementChannel?.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (announcementsError) {
      console.error('Error loading announcements:', announcementsError)
    } else {
      console.log('Loaded announcements:', announcementsData?.map(p => ({
        title: p.title,
        channel: p.channel?.name,
        channel_slug: p.channel?.slug
      })))
    }
    announcements = announcementsData
  } else {
    // Mock data for local testing with admin session
    profile = {
      full_name: 'Admin User',
      role: 'Admin',
      mfa_enabled: false,
      graduation_year: 2024
    }

    channels = [
      { id: 1, name: 'General', slug: 'general', icon: '💬', requires_mfa: false },
      { id: 2, name: 'Promotions', slug: 'promotions', icon: '📢', requires_mfa: false },
      { id: 3, name: 'Job/Internship/Networking', slug: 'jobs-networking', icon: '💼', requires_mfa: false },
      { id: 4, name: 'Fundraising', slug: 'fundraising', icon: '💍', requires_mfa: false },
      { id: 5, name: 'Football Tickets', slug: 'football-tickets', icon: '🎟️', requires_mfa: true }
    ]

    // Load posts from localStorage or use defaults
    const storedPosts = typeof window !== 'undefined' ? localStorage.getItem('mockPosts') : null
    let allPosts = []
    if (storedPosts) {
      allPosts = JSON.parse(storedPosts)
    } else {
      allPosts = [
        {
          id: 1,
          channel_id: '1',
          title: 'Welcome to the Aggie Community!',
          content: 'Excited to be part of this platform connecting current and former students. Looking forward to networking and helping fellow Aggies succeed!',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          author: { full_name: 'John Smith', role: 'Personal' },
          channel: { name: 'General', icon: '💬' },
          is_pinned: false
        },
        {
          id: 2,
          channel_id: '3',
          title: 'Job Opportunity: Software Engineer at Tech Company',
          content: 'We\'re hiring! Looking for talented software engineers with experience in React and Node.js. Competitive salary and benefits. Remote work available.',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          author: { full_name: 'Jane Doe', role: 'Business' },
          channel: { name: 'Job/Internship/Networking', icon: '💼' },
          is_pinned: false
        },
        {
          id: 3,
          channel_id: '4',
          title: 'Aggie Ring Fundraiser',
          content: 'Help a fellow Aggie achieve their ring! We\'re raising funds for graduation rings. Every contribution makes a difference. #AggiePride',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          author: { full_name: 'Bob Johnson', role: 'Charity' },
          channel: { name: 'Fundraising', icon: '💍' },
          is_pinned: false
        }
      ]
      // Save default posts to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('mockPosts', JSON.stringify(allPosts))
      }
    }
    // Filter out announcements from community feed
    posts = allPosts.filter((post: any) => post.channel_id !== '6')

    // Filter announcements from all posts
    announcements = allPosts.filter((post: any) => post.channel_id === '6')

    // If no announcements exist, add a default one
    if (announcements.length === 0) {
      const defaultAnnouncement = {
        id: 'announcement-1',
        channel_id: '6',
        title: 'Welcome to Aggies Helping Aggies!',
        content: 'We\'re excited to launch this platform connecting current and former Aggies. Remember to follow our community guidelines and help fellow Aggies succeed.',
        created_at: new Date().toISOString(),
        author: { full_name: 'Admin', role: 'Admin' },
        channel: { name: 'Announcements', icon: '📌' },
        is_pinned: true
      }
      announcements = [defaultAnnouncement]
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-4">
      {/* Main Feed */}
      <div className="lg:col-span-3 space-y-6">
        {/* Welcome Card */}
        <Card className="border-primary/30">
          <CardHeader className="bg-primary text-primary-foreground">
            <CardTitle className="text-2xl">
              Howdy, {profile?.full_name}! 👋
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Welcome to the Aggie community. Stay connected, share opportunities, and help fellow Aggies thrive.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Link href="/post-creation">
                <Button size="lg">
                  Create New Post
                </Button>
              </Link>
              {!profile?.mfa_enabled && (
                <Link href="/dashboard/security">
                  <Button size="lg" variant="secondary">
                    🔒 Enable Two-Factor Auth
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Announcements Section */}
        {announcements && announcements.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-primary">📌 Announcements</h2>
              {profile?.role === 'Admin' && (
                <Link href="/post-creation?channel=announcements">
                  <Button variant="outline" size="sm">
                    Post Announcement
                  </Button>
                </Link>
              )}
            </div>
            
            {announcements.map((announcement: any) => (
              <Card key={announcement.id} className="border-amber-500/30 bg-amber-500/10 dark:bg-amber-900/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold">
                        📌
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-foreground">
                            {announcement.author?.full_name}
                          </p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400">
                            {announcement.author?.role}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{announcement.channel?.icon} {announcement.channel?.name}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(announcement.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {announcement.is_pinned && (
                      <span className="text-amber-700 dark:text-amber-400 text-sm font-medium">📌 Pinned</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <h3 className="text-xl font-bold text-foreground">
                    {announcement.title}
                  </h3>
                  <p className="text-foreground/90 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Posts Feed */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-primary">Community Feed</h2>
          
          {posts && posts.length > 0 ? (
            posts.map((post: any) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {/* Author Avatar */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                        {getInitials(post.author?.full_name || 'Unknown')}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-foreground">
                            {post.author?.full_name}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(post.author?.role)}`}>
                            {post.author?.role}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{post.channel?.icon} {post.channel?.name}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(post.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {post.is_pinned && (
                      <span className="text-primary text-sm font-medium">📌 Pinned</span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <h3 className="text-xl font-bold text-foreground">
                    {post.title}
                  </h3>
                  <p className="text-foreground/90 whitespace-pre-wrap">
                    {post.content.length > 300 
                      ? `${post.content.substring(0, 300)}...` 
                      : post.content
                    }
                  </p>
                  
                  <div className="flex items-center space-x-4 pt-2">
                    <Link href={`/dashboard/posts/${post.id}`}>
                      <Button variant="outline" size="sm">
                        View Full Post
                      </Button>
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      👁️ {post.view_count} views
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No posts yet. Be the first to share something with the community!
                </p>
                <Link href="/post-creation">
                  <Button>Create First Post</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Channels Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Channels</CardTitle>
            <CardDescription>Browse by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {channels?.map((channel: any) => (
              <Link key={channel.id} href={`/dashboard/channels/${channel.slug}`}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{channel.icon}</span>
                    <span className="font-medium text-sm">{channel.name}</span>
                  </div>
                  {channel.requires_mfa && (
                    <span className="text-xs text-primary">🔒</span>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Account Type</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(profile?.role || 'Personal')}`}>
                {profile?.role}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">MFA Status</span>
              <span className="text-sm font-medium">
                {profile?.mfa_enabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
            {profile?.graduation_year && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Class of</span>
                <span className="text-sm font-medium">{profile.graduation_year}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aggie Ring Fundraising */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              💍 Aggie Ring Fund
            </CardTitle>
            <CardDescription>
              Help fellow Aggies achieve their Ring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/channels/aggie-ring">
              <Button className="w-full" variant="outline">
                View Fundraisers
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
