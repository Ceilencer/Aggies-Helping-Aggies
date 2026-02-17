import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'
import FloatingCreatePostButton from '@/components/FloatingCreatePostButton'
import { createClient } from '@/lib/supabase/server'

// Slug aliases mapping
const SLUG_ALIASES: Record<string, string> = {
  'aggie-ring': 'fundraising',
  'tickets': 'football-tickets',
  'jobs': 'jobs-networking',
}

export default async function ChannelPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> // <-- Changed to Promise
}) {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Await params
  const { slug: rawSlug } = await params // <-- Added await
  const canonicalSlug = SLUG_ALIASES[rawSlug] ?? rawSlug

  // Fetch channel
  const { data: channel, error: channelError } = await supabase
    .from('channels')
    .select('*')
    .in('slug', [canonicalSlug, rawSlug])
    .maybeSingle()

  if (channelError) {
    console.error('Error loading channel:', channelError)
  }

  if (!channel) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Channel Not Found</h1>
            <p className="text-muted-foreground mb-6">The channel you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch posts with authors and channel info
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels(*)
    `)
    .eq('channel_id', channel.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (postsError) {
    console.error('Error loading posts:', postsError)
  }

  const postsList = posts || []
  const postIds = postsList.map(p => p.id)

  // Batch fetch ALL comments for ALL posts in ONE query
  const { data: allComments } = await supabase
    .from('comments')
    .select('*')
    .in('post_id', postIds)

  // Batch fetch ALL likes for ALL posts in ONE query
  const { data: allLikes } = await supabase
    .from('post_likes')
    .select('*')
    .in('post_id', postIds)

  // Group comments and likes by post_id for easy lookup
  const commentsByPost = (allComments || []).reduce((acc, comment) => {
    if (!acc[comment.post_id]) acc[comment.post_id] = []
    acc[comment.post_id].push(comment)
    return acc
  }, {} as Record<string, any[]>)

  const likesByPost = (allLikes || []).reduce((acc, like) => {
    if (!acc[like.post_id]) acc[like.post_id] = []
    acc[like.post_id].push(like)
    return acc
  }, {} as Record<string, any[]>)

  // Attach comments and likes to each post
  const postsWithMetadata = postsList.map(post => ({
    ...post,
    comments: commentsByPost[post.id] || [],
    likes: likesByPost[post.id] || [],
  }))

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <span className="text-3xl">{channel.icon}</span>
          <div>
            <h1 className="text-3xl font-bold text-primary">{channel.name}</h1>
            <p className="text-muted-foreground">{channel.description}</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-primary">Posts</h2>

        {postsWithMetadata.length > 0 ? (
          postsWithMetadata.map((post: any) => (
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

              <CardContent className="space-y-3">
                <h3 className="text-xl font-bold text-card-header-text">
                  {post.title}
                </h3>
                <p className="text-card-subtext whitespace-pre-wrap">
                  {post.content.length > 300
                    ? `${post.content.substring(0, 300)}...`
                    : post.content
                  }
                </p>
                
                {/* Show comment/like counts if you want */}
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>💬 {post.comments.length} comments</span>
                  <span>❤️ {post.likes.length} likes</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No posts in this channel yet. Be the first to share something!
              </p>
              {!channel.is_read_only && (
                <Link href={`/dashboard/post-creation?channel=${channel.slug}`}>
                  <Button>Create First Post</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {!channel.is_read_only && (
        <FloatingCreatePostButton />
      )}
    </div>
  )
}