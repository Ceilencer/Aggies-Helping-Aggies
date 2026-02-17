'use client'

import { useMemo, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PostLikeButton from '@/components/PostLikeButton'
import CommentCountButton from '@/components/CommentCountButton'
import PostCardHeader from '@/components/PostCardHeader'
import { formatRelativeTime, getRoleBadgeColor, getInitials } from '@/lib/utils'
import FloatingCreatePostButton from '@/components/FloatingCreatePostButton'
import { createClient } from '@/lib/supabase/client'

export default function ChannelPage() {
  const params = useParams()
  const router = useRouter()
  const rawSlug = params.slug as string
  const canonicalSlug = useMemo(() => {
    const slugAliases: Record<string, string> = {
      'aggie-ring': 'fundraising',
      'tickets': 'football-tickets',
      'jobs': 'jobs-networking',
    }
    return slugAliases[rawSlug] ?? rawSlug
  }, [rawSlug])
  const supabase = createClient()

  const [channel, setChannel] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userAuthenticated, setUserAuthenticated] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  useEffect(() => {
    const loadChannelData = async () => {
      // Check for real Supabase authentication
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login')
        return
      }

      setUserAuthenticated(true)
      await loadSupabaseData(user.id)
    }

    const loadSupabaseData = async (userId: string) => {
      try {
        // Load user role
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        
        if (profileData) {
          setCurrentUserRole(profileData.role)
        }

        // Load all channels for admin menu
        const { data: allChannelsData } = await supabase
          .from('channels')
          .select('*')
          .order('name')
        
        if (allChannelsData) {
          setChannels(allChannelsData)
        }

          .from('channels')
          .select('*')
          .in('slug', [canonicalSlug, rawSlug])
          .maybeSingle()

        if (channelError) {
          console.error('Error loading channel:', channelError)
          setChannel(null)
          setLoading(false)
          return
        }

        if (!channelData) {
          setChannel(null)
          setLoading(false)
          return
        }

        setChannel(channelData)

        // Fetch posts for this channel
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles!posts_author_id_fkey(*),
            channel:channels(*)
          `)
          .eq('channel_id', channelData.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (postsError) {
          console.error('Error loading posts:', postsError)
          setPosts([])
        } else {
          const postIds = (postsData || []).map((post) => post.id)
          let likedPostIds = new Set<string>()
          let likeIdByPostId = new Map<string, string>()

          if (postIds.length > 0) {
            const { data: userLikes, error: userLikesError } = await supabase
              .from('post_likes')
              .select('id, post_id')
              .eq('user_id', userId)
              .in('post_id', postIds)

            if (userLikesError) {
              console.error('Error loading user likes:', userLikesError)
            } else {
              likedPostIds = new Set((userLikes || []).map((like) => like.post_id))
              likeIdByPostId = new Map(
                (userLikes || []).map((like) => [like.post_id, like.id])
              )
            }
          }

          const formattedPosts = (postsData || []).map((post) => ({
            ...post,
            like_count: post.likes_count ?? 0,
            comment_count: post.comment_count ?? 0,
            user_has_liked: likedPostIds.has(post.id),
            like_id: likeIdByPostId.get(post.id) ?? null,
          }))
          setPosts(formattedPosts)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error in loadSupabaseData:', error)
        setLoading(false)
      }
    }

    loadChannelData()
  }, [canonicalSlug, rawSlug, router, supabase])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
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

        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <PostCardHeader
                  post={post}
                  isAdmin={currentUserRole === 'Admin'}
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
