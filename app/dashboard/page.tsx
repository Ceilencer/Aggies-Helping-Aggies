import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PostLikeButton from '@/components/PostLikeButton'
import CommentCountButton from '@/components/CommentCountButton'
import { PostImageGrid } from '@/components/PostImageGrid'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'
import FloatingCreatePostButton from '@/components/FloatingCreatePostButton'

export default async function DashboardPage() {
  const supabase = await createClient()

  // --- WAVE 1: Authentication ---
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // --- WAVE 2: Fetch "Setup" Data in Parallel ---
  // We fire these three requests at the exact same time.
  const [profileResponse, announcementChannelResponse, homeChannelsResponse] = await Promise.all([
    // 1. Get Profile
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    // 2. Get Announcement Channel ID
    supabase.from('channels').select('id').eq('slug', 'announcements').single(),
    // 3. Get Home Channel IDs
    supabase.from('channels').select('id, slug').in('slug', ['general', 'promotions'])
  ])

  const profile = profileResponse.data
  const announcementChannel = announcementChannelResponse.data
  const homeChannels = homeChannelsResponse.data
  const homeChannelIds = homeChannels?.map(c => c.id) ?? []

  // --- WAVE 3: Fetch Content in Parallel ---
  // Now that we have the IDs from Wave 2, we fetch the heavy content simultaneously.
  const [postsResponse, announcementsResponse] = await Promise.all([
    // 1. Fetch Main Feed
    homeChannelIds.length > 0 
      ? supabase
          .from('posts')
          .select(`*, author:profiles!posts_author_id_fkey(*), channel:channels!inner(*)`)
          .in('channel_id', homeChannelIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }), // Fallback if no channels found

    // 2. Fetch Announcements
    announcementChannel?.id
      ? supabase
          .from('posts')
          .select(`*, author:profiles!posts_author_id_fkey(*), channel:channels!inner(*)`)
          .eq('channel_id', announcementChannel.id)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [], error: null })
  ])

  const postsData = postsResponse.data || []
  const announcements = announcementsResponse.data || []

  // --- WAVE 4: Optimize Likes (Batch Processing) ---
  // This is fast because we already have the post IDs.
  let posts = postsData

  if (postsData.length > 0) {
    const postIds = postsData.map((post: any) => post.id)
    
    // Fetch likes for ALL posts in one single query
    const { data: userLikes } = await supabase
      .from('post_likes')
      .select('id, post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)

    // Map them for O(1) lookup
    const likedPostIds = new Set((userLikes || []).map((like) => like.post_id))
    const likeIdByPostId = new Map((userLikes || []).map((like) => [like.post_id, like.id]))

    // Merge data efficiently
    posts = postsData.map((post: any) => ({
      ...post,
      like_count: post.likes_count ?? 0,
      comment_count: post.comment_count ?? 0,
      user_has_liked: likedPostIds.has(post.id),
      like_id: likeIdByPostId.get(post.id) ?? null,
    }))
  }

  // --- RENDER (No changes below here) ---
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader className="bg-dash-header-bg text-dash-header-text">
          <CardTitle className="text-2xl text-dash-header-text">
            <span className="inline-flex items-center gap-3">
              {profile?.avatar_url ? (
                <span className="relative h-10 w-10 overflow-hidden rounded-full">
                  <Image
                    src={profile.avatar_url}
                    alt={`${profile?.full_name || 'User'} avatar`}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {getInitials(profile?.full_name || 'Unknown')}
                </span>
              )}
              <span>Howdy, {profile?.full_name}! 👋</span>
            </span>
          </CardTitle>
          <CardDescription className="text-dash-header-text/80">
            Welcome to the Aggie community. Stay connected, share opportunities, and help fellow Aggies thrive.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/post-creation">
              <Button size="lg">
                Create New Post
              </Button>
            </Link>
            <Link href="/dashboard/my-posts">
              <Button size="lg" variant="outline">
                View My Posts
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-page-heading-text">Home Feed</h2>
          {profile?.role === 'Admin' && (
            <Link href="/dashboard/post-creation?channel=announcements">
              <Button variant="outline" size="sm">
                Post Announcement
              </Button>
            </Link>
          )}
        </div>

        {announcements && announcements.length > 0 && (
          announcements.map((announcement: any) => (
            <Card
              key={announcement.id}
              className="bg-pinned-announcement-bg/5 border-l-4 border-pinned-announcement-border dark:bg-pinned-announcement-bg/20 dark:border-l-4 dark:border-pinned-announcement-border-dark"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {announcement.author?.avatar_url ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-full">
                        <Image
                          src={announcement.author.avatar_url}
                          alt={`${announcement.author?.full_name || 'User'} avatar`}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                        {getInitials(announcement.author?.full_name || 'Unknown')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-card-header-text">
                          {announcement.author?.full_name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(announcement.author?.role)}`}>
                          {announcement.author?.role}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-card-subtext">
                        <span>{announcement.channel?.icon} {announcement.channel?.name}</span>
                        <span>•</span>
                        <span>📌 {formatRelativeTime(announcement.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <h3 className="text-xl font-bold text-card-header-text">
                  {announcement.title}
                </h3>
                <p className="text-card-subtext whitespace-pre-wrap">
                  {announcement.content}
                </p>
                
                {/* Display images in grid */}
                {announcement.images && announcement.images.length > 0 && (
                  <PostImageGrid images={announcement.images} postTitle={announcement.title} maxImages={3} />
                )}
              </CardContent>
            </Card>
          ))
        )}
        
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {/* Author Avatar */}
                    {post.author?.avatar_url ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-full">
                        <Image
                          src={post.author.avatar_url}
                          alt={`${post.author?.full_name || 'User'} avatar`}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                        {getInitials(post.author?.full_name || 'Unknown')}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-card-header-text">
                          {post.author?.full_name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(post.author?.role)}`}>
                          {post.author?.role}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-card-subtext">
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
              
              <CardContent className="space-y-3 pb-0">
                <h3 className="text-xl font-bold text-card-header-text">
                  {post.title}
                </h3>
                <p className="text-card-subtext whitespace-pre-wrap">
                  {post.content.length > 300 
                    ? `${post.content.substring(0, 300)}...` 
                    : post.content
                  }
                </p>
                
                {/* Display images in grid */}
                {post.images && post.images.length > 0 && (
                  <PostImageGrid images={post.images} postTitle={post.title} maxImages={3} />
                )}
                
                <div className="flex items-center justify-between space-x-4 py-4 border-t">
                  <div className="flex items-center space-x-4">
                    <PostLikeButton
                      postId={post.id}
                      likeCount={post.like_count || 0}
                      userHasLiked={post.user_has_liked || false}
                      likeId={post.like_id || null}
                    />
                    <CommentCountButton
                      postId={post.id}
                      commentCount={post.comment_count || 0}
                    />
                    <span className="text-sm text-card-subtext">
                      👁️ {post.view_count} views
                    </span>
                  </div>
                  <Link href={`/dashboard/posts/${post.id}`}>
                    <Button variant="outline" size="sm">
                      View Full Post
                    </Button>
                  </Link>
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
              <Link href="/dashboard/post-creation">
                <Button>Create First Post</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <FloatingCreatePostButton />
    </div>
  )
}