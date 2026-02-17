import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CommentCountButton from '@/components/CommentCountButton'
import PostLikeButton from '@/components/PostLikeButton'
import PostCardHeader from '@/components/PostCardHeader'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'

export default async function MyPostsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to landing if not authenticated
  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData

  // Fetch all channels for admin menu
  const { data: channelsData } = await supabase
    .from('channels')
    .select('*')
    .order('name')
  const channels = channelsData || []

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

  // Fetch comment counts and user like status for each post
  let postsWithCounts = postsData || []
  if (postsData && postsData.length > 0) {
    const postIds = postsData.map((post: any) => post.id)
    let likedPostIds = new Set<string>()
    let likeIdByPostId = new Map<string, string>()

    const { data: userLikes, error: userLikesError } = await supabase
      .from('post_likes')
      .select('id, post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)

    if (userLikesError) {
      console.error('Error loading user likes:', userLikesError)
    } else {
      likedPostIds = new Set((userLikes || []).map((like) => like.post_id))
      likeIdByPostId = new Map(
        (userLikes || []).map((like) => [like.post_id, like.id])
      )
    }

    postsWithCounts = postsData.map((post: any) => ({
      ...post,
      like_count: post.likes_count ?? 0,
      comment_count: post.comment_count ?? 0,
      user_has_liked: likedPostIds.has(post.id),
      like_id: likeIdByPostId.get(post.id) ?? null,
    }))
  }

  const posts = postsWithCounts

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="bg-dash-header-bg text-dash-header-text">
          <CardTitle className="text-2xl text-dash-header-text">My Posts</CardTitle>
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
          </div>
        </CardContent>
      </Card>

      {/* Posts List */}
      <div className="space-y-4">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <PostCardHeader
                  post={post}
                  isAdmin={profile?.role === 'Admin'}
                  channels={channels}
                />
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
