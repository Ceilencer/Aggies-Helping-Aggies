import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChannelAnnouncement, Profile } from '@/lib/types'

const POSTS_PAGE_SIZE = 10

type UseChannelFeedStateArgs = {
  rawSlug: string
  canonicalSlug: string
}

export function useChannelFeedState({ rawSlug, canonicalSlug }: UseChannelFeedStateArgs) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [channel, setChannel] = useState<any>(null)
  const [channelAnnouncement, setChannelAnnouncement] = useState<ChannelAnnouncement | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [postOffset, setPostOffset] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [likeIdByPostId, setLikeIdByPostId] = useState<Map<string, string>>(new Map())
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  const prefetchedPageRef = useRef<{
    offset: number
    formattedPosts: any[]
    fetchedCount: number
  } | null>(null)
  const prefetchInFlightRef = useRef(false)

  const formatPostsWithCounts = useCallback((postsData: any[], likedIds: Set<string>, likeIdsByPost: Map<string, string>, commentCounts: Map<string, number>) => {
    return postsData.map((post) => ({
      ...post,
      like_count: post.likes_count ?? 0,
      comment_count: commentCounts.get(post.id) ?? 0,
      user_has_liked: likedIds.has(post.id),
      like_id: likeIdsByPost.get(post.id) ?? null,
      pending_edit: Array.isArray(post.pending_edit) ? (post.pending_edit[0] ?? null) : post.pending_edit,
    }))
  }, [])

  const fetchPostsPage = useCallback(async (
    channelId: string,
    offset: number,
    userId: string
  ) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, title, content, created_at, author_id, channel_id, approval_status, is_moderated, likes_count,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
        channel:channels(id, name, slug, description),
        pending_edit:post_edits(proposed_title, proposed_content)
      `)
      .eq('channel_id', channelId)
      .eq('is_moderated', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + POSTS_PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    const postsData = data || []
    const postIds = postsData.map(p => p.id)
    let commentCountMap = new Map<string, number>()
    let likedIds = new Set<string>()
    let likeIdsByPost = new Map<string, string>()

    // Fetch comments and likes for these specific posts in parallel (not all user likes)
    if (postIds.length > 0) {
      const [{ data: commentData, error: commentError }, { data: likesData, error: likesError }] = await Promise.all([
        supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('post_likes')
          .select('id, post_id')
          .eq('user_id', userId)
          .in('post_id', postIds)
      ])

      if (!commentError && commentData) {
        commentData.forEach((comment) => {
          commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) || 0) + 1)
        })
      }

      if (!likesError && likesData) {
        likedIds = new Set(likesData.map(like => like.post_id))
        likeIdsByPost = new Map(likesData.map(like => [like.post_id, like.id]))
      }
    }

    return {
      formattedPosts: formatPostsWithCounts(postsData, likedIds, likeIdsByPost, commentCountMap),
      fetchedCount: postsData.length,
    }
  }, [formatPostsWithCounts, supabase])

  const fetchChannelAnnouncement = useCallback(async (channelId: string) => {
    const { data, error } = await supabase
      .from('channel_announcements')
      .select(`
        id,
        channel_id,
        title,
        content,
        updated_by,
        created_at,
        updated_at,
        updated_by_profile:profiles!channel_announcements_updated_by_fkey(id, full_name, avatar_url, role)
      `)
      .eq('channel_id', channelId)
      .maybeSingle()

    if (error) {
      console.error('Error loading channel announcement:', error)
      setChannelAnnouncement(null)
      return
    }

    const normalizedAnnouncement = data
      ? {
          ...data,
          updated_by_profile: Array.isArray(data.updated_by_profile)
            ? data.updated_by_profile[0] || null
            : data.updated_by_profile || null,
        }
      : null

    setChannelAnnouncement(normalizedAnnouncement)
  }, [supabase])

  const prefetchNextPage = useCallback(async (channelId: string, userId: string, offset: number) => {
    if (prefetchInFlightRef.current || prefetchedPageRef.current?.offset === offset) {
      return
    }

    prefetchInFlightRef.current = true
    try {
      const page = await fetchPostsPage(channelId, offset, userId)
      prefetchedPageRef.current = {
        offset,
        formattedPosts: page.formattedPosts,
        fetchedCount: page.fetchedCount,
      }
    } catch {
      prefetchedPageRef.current = null
    } finally {
      prefetchInFlightRef.current = false
    }
  }, [fetchPostsPage])

  const loadMorePosts = useCallback(async () => {
    if (!channel?.id || !currentUserId || isLoadingMore || !hasMorePosts) {
      return
    }

    setIsLoadingMore(true)
    try {
      const prefetched = prefetchedPageRef.current
      const page = prefetched && prefetched.offset === postOffset
        ? prefetched
        : await fetchPostsPage(
            channel.id,
            postOffset,
            currentUserId
          )

      prefetchedPageRef.current = null

      const { formattedPosts, fetchedCount } = page

      setPosts(current => [...current, ...formattedPosts])
      const nextOffset = postOffset + fetchedCount
      const nextHasMore = fetchedCount === POSTS_PAGE_SIZE

      setPostOffset(nextOffset)
      setHasMorePosts(nextHasMore)

      if (nextHasMore) {
        void prefetchNextPage(channel.id, currentUserId, nextOffset)
      }
    } catch (error) {
      console.error('Error loading more posts:', error)
      setHasMorePosts(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [channel?.id, currentUserId, fetchPostsPage, hasMorePosts, isLoadingMore, postOffset, prefetchNextPage])

  useEffect(() => {
    const loadChannelData = async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
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
        prefetchedPageRef.current = null

        // Fetch profile, all channels, and target channel in parallel - select only needed columns
        const [profileResponse, allChannelsResponse, channelResponse] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, role, full_name, avatar_url')
            .eq('id', userId)
            .single(),
          supabase
            .from('channels')
            .select('id, name, slug, description')
            .order('name'),
          supabase
            .from('channels')
            .select('id, name, slug, description')
            .in('slug', [canonicalSlug, rawSlug])
            .maybeSingle(),
        ])

        const profileData = profileResponse.data
        const allChannelsData = allChannelsResponse.data || []
        const channelData = channelResponse.data
        const channelError = channelResponse.error

        if (profileData) {
          setCurrentUserRole(profileData.role)
          setCurrentUserProfile(profileData as any)
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

        // Load announcement and posts in parallel instead of sequentially
        try {
          const [announceResult, postsResult] = await Promise.all([
            fetchChannelAnnouncement(channelData.id),
            fetchPostsPage(channelData.id, 0, userId)
          ])
          
          const { formattedPosts, fetchedCount } = postsResult as any
          setPosts(formattedPosts)
          setPostOffset(fetchedCount)
          const initialHasMore = fetchedCount === POSTS_PAGE_SIZE
          setHasMorePosts(initialHasMore)

          if (initialHasMore) {
            void prefetchNextPage(channelData.id, userId, fetchedCount)
          }
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
  }, [canonicalSlug, rawSlug, router, supabase, fetchChannelAnnouncement, fetchPostsPage, prefetchNextPage])

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
      { root: null, rootMargin: '750px 0px', threshold: 0.1 }
    )

    observer.observe(trigger)
    return () => {
      observer.disconnect()
    }
  }, [channel?.id, hasMorePosts, loadMorePosts, loading])

  return {
    channel,
    setChannel,
    channelAnnouncement,
    setChannelAnnouncement,
    posts,
    setPosts,
    channels,
    loading,
    currentUserRole,
    currentUserId,
    currentUserProfile,
    postOffset,
    setPostOffset,
    hasMorePosts,
    isLoadingMore,
    loadMoreTriggerRef,
  }
}