import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'

export default async function MyPostsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData

  // Fetch all posts by the logged-in user
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels!inner(*)
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  if (postsError) {
    console.error('Error loading posts:', postsError)
  }
  const posts = postsData

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="bg-dash-header-bg text-dash-header-text">
          <CardTitle className="text-2xl">My Posts</CardTitle>
          <CardDescription className="text-dash-header-text/80">
            View all posts you've created
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/post-creation">
              <Button size="lg">
                Create New Post
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <div className="space-y-4">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
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
                You haven't created any posts yet. Share something with the community!
              </p>
              <Link href="/dashboard/post-creation">
                <Button>Create Your First Post</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
