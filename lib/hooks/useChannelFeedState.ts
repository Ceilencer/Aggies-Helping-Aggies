import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChannelAnnouncement, ChannelListDTO, FeedAuthorDTO, FeedPost, FeedPostQueryRowDTO, UserRole } from '@/lib/types'

const POSTS_PAGE_SIZE = 10

type UseChannelFeedStateArgs = {
  rawSlug: string
  canonicalSlug: string
}

export function useChannelFeedState({ rawSlug, canonicalSlug }: UseChannelFeedStateArgs) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [channel, setChannel] = useState<ChannelListDTO | null>(null)
  const [channelAnnouncement, setChannelAnnouncement] = useState<ChannelAnnouncement | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [channels, setChannels] = useState<ChannelListDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | ''>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserProfile, setCurrentUserProfile] = useState<FeedAuthorDTO | null>(null)
  const [postOffset, setPostOffset] = useState(0)
  const [totalPostCount, setTotalPostCount] = useState<number | null>(null)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [likeIdByPostId, setLikeIdByPostId] = useState<Map<string, string>>(new Map())
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  const prefetchedPageRef = useRef<{
    offset: number
    formattedPosts: FeedPost[]
    fetchedCount: number
    totalCount: number | null
  } | null>(null)
  const prefetchInFlightRef = useRef(false)

  const formatPostsWithCounts = useCallback((postsData: FeedPostQueryRowDTO[], likedIds: Set<string>, likeIdsByPost: Map<string, string>, commentCounts: Map<string, number>): FeedPost[] => {
    return postsData.map((post) => ({
      id: post.id,
      channel_id: post.channel_id,
      author_id: post.author_id,
      title: post.title,
      content: post.content,
      images: post.images,
      is_pinned: post.is_pinned,
      is_moderated: post.is_moderated,
      moderation_reason: post.moderation_reason,
      approval_status: post.approval_status,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: Array.isArray(post.author) ? (post.author[0] ?? null) : (post.author ?? null),
      channel: Array.isArray(post.channel) ? (post.channel[0] ?? null) : (post.channel ?? null),
      like_count: post.likes_count ?? 0,
      comment_count: commentCounts.get(post.id) ?? 0,
      user_has_liked: likedIds.has(post.id),
      like_id: likeIdsByPost.get(post.id) ?? null,
      pending_edit: Array.isArray(post.pending_edit) ? (post.pending_edit[0] ?? null) : (post.pending_edit ?? null),
    }))
  }, [])

  const fetchPostsPage = useCallback(async (
    channelId: string,
    offset: number,
    userId: string
  ) => {
    const { data, error, count } = await supabase
      .from('posts')
      .select(`
        id, title, content, images, is_pinned, created_at, author_id, channel_id, approval_status, is_moderated, moderation_reason, likes_count,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
        channel:channels(id, name, slug, description, icon),
        pending_edit:post_edits(proposed_title, proposed_content)
      `, { count: 'exact' })
      .eq('channel_id', channelId)
      .eq('is_moderated', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + POSTS_PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    const postsData = (data || []) as FeedPostQueryRowDTO[]
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
      totalCount: count ?? null,
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
        totalCount: page.totalCount,
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

      const { formattedPosts, fetchedCount, totalCount } = page
      if (totalCount !== null) setTotalPostCount(totalCount)

      setPosts(current => [...current, ...formattedPosts])
      const nextOffset = postOffset + fetchedCount
      const nextHasMore = totalCount !== null
        ? nextOffset < totalCount
        : fetchedCount === POSTS_PAGE_SIZE

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
            .select('id, name, slug, description, icon, is_read_only')
            .order('name'),
          supabase
            .from('channels')
            .select('id, name, slug, description, icon, is_read_only')
            .in('slug', [canonicalSlug, rawSlug])
            .maybeSingle(),
        ])

        const profileData = profileResponse.data as { id: string; role: UserRole; full_name: string; avatar_url?: string } | null
        const allChannelsData = (allChannelsResponse.data || []) as ChannelListDTO[]
        const channelData = channelResponse.data as ChannelListDTO | null
        const channelError = channelResponse.error

        if (profileData) {
          setCurrentUserRole(profileData.role)
          setCurrentUserProfile({
            id: profileData.id,
            full_name: profileData.full_name,
            avatar_url: profileData.avatar_url,
            role: profileData.role,
          })
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

          const { formattedPosts, fetchedCount, totalCount } = postsResult
          setPosts(formattedPosts)
          setPostOffset(fetchedCount)
          if (totalCount !== null) setTotalPostCount(totalCount)
          const initialHasMore = totalCount !== null
            ? fetchedCount < totalCount
            : fetchedCount === POSTS_PAGE_SIZE
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