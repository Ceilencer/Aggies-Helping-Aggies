'use client'

import { useMemo, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PostLikeButton from '@/components/PostLikeButton'
import CommentCountButton from '@/components/CommentCountButton'
import PostCardHeader from '@/components/PostCardHeader'
import FloatingCreatePostButton from '@/components/FloatingCreatePostButton'
import CreatePostModal from '@/components/CreatePostModal'
import EditPostModal from '@/components/EditPostModal'
import PostDetailModal from '@/components/PostDetailModal'
import UserProfileModal from '@/components/UserProfileModal'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Post, Channel } from '@/lib/types'

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
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)

  useEffect(() => {
    const loadChannelData = async () => {
      // Check for real Supabase authentication
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)
      await loadSupabaseData(user.id)
    }

    const loadSupabaseData = async (userId: string) => {
      try {
        // WAVE 1: Fetch user profile and channels in parallel
        const [profileResponse, allChannelsResponse, channelResponse] = await Promise.all([
          // 1. Get user profile (role)
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single(),
          // 2. Get all channels for admin menu
          supabase
            .from('channels')
            .select('*')
            .order('name'),
          // 3. Get specific channel by slug
          supabase
            .from('channels')
            .select('*')
            .in('slug', [canonicalSlug, rawSlug])
            .maybeSingle(),
        ])

        const profileData = profileResponse.data
        const allChannelsData = allChannelsResponse.data || []
        const channelData = channelResponse.data
        const channelError = channelResponse.error

        if (profileData) {
          setCurrentUserRole(profileData.role)
          setCurrentUserProfile(profileData)
        }

        if (allChannelsData.length > 0) {
          setChannels(allChannelsData)
        }

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

        // WAVE 2: Fetch posts and user likes in parallel
        const [postsResponse, userLikesResponse] = await Promise.all([
          // 1. Fetch posts for this channel (approved only)
          supabase
            .from('posts')
            .select(`
              *,
              author:profiles!posts_author_id_fkey(*),
              channel:channels(*)
            `)
            .eq('channel_id', channelData.id)
            .eq('is_moderated', true)
            .order('created_at', { ascending: false })
            .limit(50),
          // 2. Fetch ALL user likes (we'll filter below)
          supabase
            .from('post_likes')
            .select('id, post_id')
            .eq('user_id', userId),
        ])

        const postsData = postsResponse.data || []
        const allUserLikes = userLikesResponse.data || []

        if (postsResponse.error) {
          console.error('Error loading posts:', postsResponse.error)
          setPosts([])
        } else {
          // Create lookup maps for O(1) access
          const postIds = new Set(postsData.map((post) => post.id))
          const likedPostIds = new Set(
            allUserLikes.filter((like) => postIds.has(like.post_id)).map((like) => like.post_id)
          )
          const likeIdByPostId = new Map(
            allUserLikes
              .filter((like) => postIds.has(like.post_id))
              .map((like) => [like.post_id, like.id])
          )

          const formattedPosts = postsData.map((post) => ({
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
                  currentUserId={currentUserId}
                  onPostDeleted={(postId) => {
                    setPosts(current => current.filter(item => item.id !== postId))
                  }}
                  onEditClick={() => setEditingPostId(post.id)}
                  onOpenProfile={(userId) => setActiveProfileId(userId)}
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
                      onOpenPost={() => setActivePostId(post.id)}
                    />
                    <span className="text-sm text-card-subtext">
                      👁️ {post.view_count} views
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActivePostId(post.id)}>
                    View Full Post
                  </Button>
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
                <Button onClick={() => setCreatePostOpen(true)}>Create First Post</Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {!channel.is_read_only && (
        <FloatingCreatePostButton onClick={() => setCreatePostOpen(true)} />
      )}

      <CreatePostModal
        isOpen={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        initialChannelSlug={channel.slug}
        onPostCreated={(newPost: Post, resolvedChannel: Channel | null) => {
          const hydratedPost = {
            ...newPost,
            author: currentUserProfile || undefined,
            channel: resolvedChannel || channel,
            like_count: 0,
            comment_count: 0,
            user_has_liked: false,
            like_id: null,
            view_count: newPost.view_count ?? 0,
          }
          setPosts(current => [hydratedPost, ...current])
        }}
      />

      <PostDetailModal
        isOpen={!!activePostId}
        postId={activePostId}
        onClose={() => setActivePostId(null)}
        onPostDeleted={(postId) => {
          setPosts(current => current.filter(item => item.id !== postId))
        }}
      />

      <UserProfileModal
        isOpen={!!activeProfileId}
        userId={activeProfileId}
        onClose={() => setActiveProfileId(null)}
      />

      {editingPostId && (
        <EditPostModal
          isOpen={!!editingPostId}
          onClose={() => setEditingPostId(null)}
          post={posts.find(item => item.id === editingPostId) as Post}
          channel={channels.find(item => item.id === posts.find(post => post.id === editingPostId)?.channel_id)}
          onPostUpdated={(updatedPost) => {
            setPosts(current => current.map(item => item.id === updatedPost.id ? { ...item, ...updatedPost } : item))
            setEditingPostId(null)
          }}
        />
      )}
    </div>
  )
}
