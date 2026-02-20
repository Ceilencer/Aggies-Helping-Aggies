import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChannelAnnouncement, Profile } from '@/lib/types'

const POSTS_PAGE_SIZE = 5

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

        const [profileResponse, allChannelsResponse, channelResponse] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single(),
          supabase
            .from('channels')
            .select('*')
            .order('name'),
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

        await fetchChannelAnnouncement(channelData.id)

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
  }, [canonicalSlug, rawSlug, router, supabase, fetchChannelAnnouncement, fetchPostsPage])

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