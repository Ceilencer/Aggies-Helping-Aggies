'use client'

import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PostLikeButton from '@/components/PostLikeButton'
import CommentCountButton from '@/components/CommentCountButton'
import PostCardHeader from '@/components/PostCardHeader'
import { PostImageGrid } from '@/components/PostImageGrid'
import FloatingCreatePostButton from '@/components/FloatingCreatePostButton'
import CreatePostModal from '@/components/CreatePostModal'
import EditPostModal from '@/components/EditPostModal'
import PostDetailModal from '@/components/PostDetailModal'
import UserProfileModal from '@/components/UserProfileModal'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Post, Channel } from '@/lib/types'

const POSTS_PAGE_SIZE = 5

function ChannelLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Card */}
      <div className="rounded-lg border bg-card">
        <div className="bg-muted p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-muted-foreground/20" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-48 rounded bg-muted-foreground/20" />
              <div className="h-4 w-96 rounded bg-muted-foreground/20" />
            </div>
          </div>
        </div>
        <div className="p-6 border-t">
          <div className="h-10 w-40 rounded bg-muted" />
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-56 rounded bg-muted" />
                </div>
              </div>
              <div className="h-8 w-8 rounded bg-muted" />
            </div>

            <div className="h-6 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4">
                <div className="h-5 w-8 rounded bg-muted" />
                <div className="h-5 w-8 rounded bg-muted" />
                <div className="h-5 w-20 rounded bg-muted" />
              </div>
              <div className="h-8 w-28 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  const supabase = useMemo(() => createClient(), [])

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [postOffset, setPostOffset] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [likeIdByPostId, setLikeIdByPostId] = useState<Map<string, string>>(new Map())
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)

  const formatPosts = useCallback((postsData: any[], likedIds: Set<string>, likeIdsByPost: Map<string, string>) => {
    return postsData.map((post) => ({
      ...post,
      like_count: post.likes_count ?? 0,
      comment_count: post.comment_count ?? 0,
      user_has_liked: likedIds.has(post.id),
      like_id: likeIdsByPost.get(post.id) ?? null,
    }))
  }, [])

  const fetchPostsPage = useCallback(async (
    channelId: string,
    offset: number,
    likedIds: Set<string>,
    likeIdsByPost: Map<string, string>
  ) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(*),
        channel:channels(*)
      `)
      .eq('channel_id', channelId)
      .eq('is_moderated', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + POSTS_PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    const postsData = data || []
    return {
      formattedPosts: formatPosts(postsData, likedIds, likeIdsByPost),
      fetchedCount: postsData.length,
    }
  }, [formatPosts, supabase])

  const loadMorePosts = useCallback(async () => {
    if (!channel?.id || !currentUserId || isLoadingMore || !hasMorePosts) {
      return
    }

    setIsLoadingMore(true)
    try {
      const { formattedPosts, fetchedCount } = await fetchPostsPage(
        channel.id,
        postOffset,
        likedPostIds,
        likeIdByPostId
      )

      setPosts(current => [...current, ...formattedPosts])
      setPostOffset(current => current + fetchedCount)
      setHasMorePosts(fetchedCount === POSTS_PAGE_SIZE)
    } catch (error) {
      console.error('Error loading more posts:', error)
      setHasMorePosts(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [channel?.id, currentUserId, fetchPostsPage, hasMorePosts, isLoadingMore, likeIdByPostId, likedPostIds, postOffset])

  useEffect(() => {
    const loadChannelData = async () => {
      // Reset loading state when channel changes
      setLoading(true)
      
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
        setPostOffset(0)
        setHasMorePosts(true)
        setIsLoadingMore(false)

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

        // WAVE 2: Fetch user likes and first page of posts
        const { data: allUserLikes, error: userLikesError } = await supabase
          .from('post_likes')
          .select('id, post_id')
          .eq('user_id', userId)

        if (userLikesError) {
          console.error('Error loading user likes:', userLikesError)
          setLikedPostIds(new Set())
          setLikeIdByPostId(new Map())
        }

        const likesData = allUserLikes || []
        const likedIds = new Set(likesData.map((like) => like.post_id))
        const likeIdsByPost = new Map(likesData.map((like) => [like.post_id, like.id]))
        setLikedPostIds(likedIds)
        setLikeIdByPostId(likeIdsByPost)

        try {
          const { formattedPosts, fetchedCount } = await fetchPostsPage(
            channelData.id,
            0,
            likedIds,
            likeIdsByPost
          )
          setPosts(formattedPosts)
          setPostOffset(fetchedCount)
          setHasMorePosts(fetchedCount === POSTS_PAGE_SIZE)
        } catch (error) {
          console.error('Error loading posts:', error)
          setPosts([])
          setPostOffset(0)
          setHasMorePosts(false)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error in loadSupabaseData:', error)
        setLoading(false)
      }
    }

    loadChannelData()
  }, [canonicalSlug, rawSlug, router, supabase, fetchPostsPage])

  useEffect(() => {
    if (!channel?.id || loading || !hasMorePosts) {
      return
    }

    const trigger = loadMoreTriggerRef.current
    if (!trigger) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMorePosts()
        }
      },
      { root: null, rootMargin: '180px 0px', threshold: 0.1 }
    )

    observer.observe(trigger)
    return () => {
      observer.disconnect()
    }
  }, [channel?.id, hasMorePosts, loadMorePosts, loading])

  if (loading) {
    return <ChannelLoadingSkeleton />
  }

  if (!channel) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Channel Not Found</h1>
          <p className="text-muted-foreground mb-6">The channel you're looking for doesn't exist.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="bg-dash-header-bg text-dash-header-text">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{channel.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-dash-header-text">{channel.name}</h1>
              <p className="text-dash-header-text/80">{channel.description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {!channel.is_read_only && (
              <Button size="lg" onClick={() => setCreatePostOpen(true)}>
                Create New Post
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="space-y-4">
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
                    setPostOffset(current => Math.max(current - 1, 0))
                  }}
                  onEditClick={() => setEditingPostId(post.id)}
                  onProfileClick={setSelectedUserId}
                />
              </CardHeader>

              <CardContent className="space-y-3 pb-0">
                <h3 className="text-xl font-bold text-card-header-text">
                  {post.title}
                </h3>
                <p className="text-card-subtext whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {post.content.length > 300
                    ? `${post.content.substring(0, 300)}...`
                    : post.content
                  }
                </p>

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

        {posts && posts.length > 0 && (
          <div ref={loadMoreTriggerRef} className="py-4 text-center">
            {isLoadingMore && (
              <p className="text-sm text-muted-foreground">Loading more posts...</p>
            )}
            {!hasMorePosts && (
              <p className="text-sm text-muted-foreground">You&apos;ve reached the end of this channel.</p>
            )}
          </div>
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
          const isApproved = newPost.approval_status === 'approved' || newPost.is_moderated === true
          if (!isApproved) {
            return
          }

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
          setPostOffset(current => current + 1)
        }}
      />

      <PostDetailModal
        isOpen={!!activePostId}
        postId={activePostId}
        onClose={() => setActivePostId(null)}
        onPostDeleted={(postId) => {
          setPosts(current => current.filter(item => item.id !== postId))
          setPostOffset(current => Math.max(current - 1, 0))
        }}
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

      <UserProfileModal
        isOpen={selectedUserId !== null}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  )
}
