import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  // Get all channels
  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .order('name')

  // Get recent posts with author info
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels(*)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="grid gap-8 lg:grid-cols-4">
      {/* Main Feed */}
      <div className="lg:col-span-3 space-y-6">
        {/* Welcome Card */}
        <Card className="border-maroon">
          <CardHeader className="bg-maroon text-white">
            <CardTitle className="text-2xl">
              Howdy, {profile?.full_name}! 👋
            </CardTitle>
            <CardDescription className="text-gray-100">
              Welcome to the Aggie community. Stay connected, share opportunities, and help fellow Aggies thrive.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard/create-post">
                <Button size="lg">
                  Create New Post
                </Button>
              </Link>
              {!profile?.mfa_enabled && (
                <Link href="/dashboard/security">
                  <Button size="lg" variant="outline" className="border-maroon text-maroon">
                    🔒 Enable Two-Factor Auth
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-maroon">Community Feed</h2>
          
          {posts && posts.length > 0 ? (
            posts.map((post: any) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {/* Author Avatar */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-maroon text-white font-semibold">
                        {getInitials(post.author?.full_name || 'Unknown')}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-gray-900">
                            {post.author?.full_name}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(post.author?.role)}`}>
                            {post.author?.role}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{post.channel?.icon} {post.channel?.name}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(post.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {post.is_pinned && (
                      <span className="text-maroon text-sm font-medium">📌 Pinned</span>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <h3 className="text-xl font-bold text-gray-900">
                    {post.title}
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
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
                    <span className="text-sm text-gray-500">
                      👁️ {post.view_count} views
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">
                  No posts yet. Be the first to share something with the community!
                </p>
                <Link href="/dashboard/create-post">
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
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{channel.icon}</span>
                    <span className="font-medium text-sm">{channel.name}</span>
                  </div>
                  {channel.requires_mfa && (
                    <span className="text-xs text-maroon">🔒</span>
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
              <span className="text-sm text-gray-600">Account Type</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(profile?.role || 'Personal')}`}>
                {profile?.role}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">MFA Status</span>
              <span className="text-sm font-medium">
                {profile?.mfa_enabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
            {profile?.graduation_year && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Class of</span>
                <span className="text-sm font-medium">{profile.graduation_year}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aggie Ring Fundraising */}
        <Card className="border-yellow-300 bg-yellow-50">
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
