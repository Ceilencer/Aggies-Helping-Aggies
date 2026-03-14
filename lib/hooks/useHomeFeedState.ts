import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Channel, FeedPost, Post, Profile } from '@/lib/types'

const HOME_FEED_PAGE_SIZE = 10

type UseHomeFeedStateArgs = {
  profile: Profile | null
  posts: FeedPost[]
  allChannels: Channel[]
}

export function useHomeFeedState({
  profile,
  posts,
  allChannels,
}: UseHomeFeedStateArgs) {
  const [postsState, setPostsState] = useState<FeedPost[]>(posts)
  const [postsOffset, setPostsOffset] = useState(posts.length)
  const [hasMorePosts, setHasMorePosts] = useState(posts.length === HOME_FEED_PAGE_SIZE)
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false)
  const [feedLoadError, setFeedLoadError] = useState<string | null>(null)
  const [pendingNewPosts, setPendingNewPosts] = useState<FeedPost[]>([])
  const postsStateRef = useRef<FeedPost[]>(posts)
  const prefetchedPageRef = useRef<{
    offset: number
    posts: FeedPost[]
    nextOffset: number
    hasMore: boolean
  } | null>(null)
  const prefetchInFlightRef = useRef(false)

  const fetchFeedPage = useCallback(async (offset: number) => {
    const response = await fetch(`/api/posts/feed?offset=${offset}&limit=${HOME_FEED_PAGE_SIZE}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`Failed to load more posts: ${response.status}`)
    }

    const data = await response.json() as {
      posts?: FeedPost[]
      nextOffset?: number
      hasMore?: boolean
    }

    const incomingPosts = data.posts || []
    return {
      posts: incomingPosts,
      nextOffset: typeof data.nextOffset === 'number' ? data.nextOffset : offset + incomingPosts.length,
      hasMore: data.hasMore === true,
    }
  }, [])

  const prefetchNextPage = useCallback(async (offset: number) => {
    if (prefetchInFlightRef.current || prefetchedPageRef.current?.offset === offset) {
      return
    }

    prefetchInFlightRef.current = true
    try {
      const page = await fetchFeedPage(offset)
      prefetchedPageRef.current = {
        offset,
        posts: page.posts,
        nextOffset: page.nextOffset,
        hasMore: page.hasMore,
      }
    } catch {
      prefetchedPageRef.current = null
    } finally {
      prefetchInFlightRef.current = false
    }
  }, [fetchFeedPage])

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMorePosts || !hasMorePosts) {
      return
    }

    setIsLoadingMorePosts(true)
    setFeedLoadError(null)
    try {
      const prefetched = prefetchedPageRef.current
      const page = prefetched && prefetched.offset === postsOffset
        ? prefetched
        : {
            offset: postsOffset,
            ...(await fetchFeedPage(postsOffset)),
          }

      prefetchedPageRef.current = null

      const incomingPosts = page.posts || []
      if (incomingPosts.length > 0) {
        setPostsState((current) => {
          const existingIds = new Set(current.map(post => post.id))
          const uniqueIncoming = incomingPosts.filter(post => !existingIds.has(post.id))
          return uniqueIncoming.length > 0 ? [...current, ...uniqueIncoming] : current
        })
      }

      setPostsOffset(page.nextOffset)
      setHasMorePosts(page.hasMore)

      if (page.hasMore) {
        void prefetchNextPage(page.nextOffset)
      }
    } catch (error) {
      console.error('Error loading more home feed posts:', error)
      setFeedLoadError('Failed to load more posts. Please try again.')
      // hasMorePosts intentionally left unchanged — a transient error doesn't mean
      // there are no more posts, and the IntersectionObserver will retry on next scroll.
    } finally {
      setIsLoadingMorePosts(false)
    }
  }, [fetchFeedPage, hasMorePosts, isLoadingMorePosts, postsOffset, prefetchNextPage])

  useEffect(() => {
    if (!hasMorePosts || postsOffset <= 0) {
      return
    }

    void prefetchNextPage(postsOffset)
  }, [hasMorePosts, postsOffset, prefetchNextPage])

  const handlePostCreated = useCallback((newPost: Post, channel: Channel | null) => {
    const isApproved = newPost.approval_status === 'approved' || newPost.is_moderated === true
    if (!isApproved) {
      return
    }

    const resolvedChannel = channel || allChannels.find(c => c.id === newPost.channel_id) || undefined
    const hydratedPost: FeedPost = {
      ...newPost,
      author: profile || undefined,
      channel: resolvedChannel,
      like_count: 0,
      comment_count: 0,
      user_has_liked: false,
      like_id: null,
      // view_count removed
    }

    setPostsState(current => [hydratedPost, ...current])
    setPostsOffset(current => current + 1)
  }, [allChannels, profile])

  const handlePostDeleted = useCallback((postId: string) => {
    setPostsState(current => {
      const exists = current.some(post => post.id === postId)
      if (exists) {
        setPostsOffset(previous => Math.max(previous - 1, 0))
      }
      return current.filter(post => post.id !== postId)
    })
  }, [])

  const handlePostLikeChange = useCallback((postId: string, likeCount: number, userHasLiked: boolean) => {
    setPostsState(current =>
      current.map(post =>
        post.id === postId
          ? {
              ...post,
              like_count: likeCount,
              user_has_liked: userHasLiked,
            }
          : post
      )
    )
  }, [])

  const handlePostUpdated = useCallback((updatedPost: Post) => {
    setPostsState(current =>
      current.map(post => {
        if (post.id !== updatedPost.id) return post
        return {
          ...updatedPost,
          author: updatedPost.author || profile || undefined,
          channel: updatedPost.channel,
          like_count: updatedPost.like_count,
          comment_count: updatedPost.comment_count,
          // Preserve like state — the edit API does not touch likes
          user_has_liked: post.user_has_liked,
          like_id: post.like_id,
        }
      })
    )
  }, [profile])

  const handlePostCommentChange = useCallback((postId: string, commentCount: number) => {
    setPostsState(current =>
      current.map(post =>
        post.id === postId
          ? {
              ...post,
              comment_count: commentCount,
            }
          : post
      )
    )
  }, [])

  // Keep ref in sync so the Realtime callback can read current posts without a stale closure
  useEffect(() => {
    postsStateRef.current = postsState
  }, [postsState])

  // Supabase Realtime: detect posts that become approved while the user is viewing the feed
  useEffect(() => {
    const supabase = createClient()
    const homeChannelIds = new Set(
      allChannels
        .filter(c => c.slug === 'general' || c.slug === 'promotions')
        .map(c => c.id)
    )
    const subscription = supabase
      .channel('home-feed-new-posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        async (payload) => {
          if (payload.eventType === 'DELETE') return
          const updated = payload.new as {
            id: string
            channel_id: string
            is_moderated: boolean
            author_id: string
          }

          if (!updated.is_moderated) return
          if (!homeChannelIds.has(updated.channel_id)) return
          // The author already sees their own post — skip to avoid showing them the banner
          if (updated.author_id === profile?.id) return

          const isAlreadyInFeed = postsStateRef.current.some(p => p.id === updated.id)

          // On UPDATE, if the post is already visible in the feed, patch its images in-place.
          // Images are uploaded and linked after the initial INSERT, so the first Realtime
          // event arrives before images exist. The subsequent UPDATE carries the real URLs.
          if (payload.eventType === 'UPDATE' && isAlreadyInFeed) {
            const { data } = await supabase
              .from('posts')
              .select('images')
              .eq('id', updated.id)
              .single()
            if (data) {
              setPostsState(current =>
                current.map(p => p.id === updated.id ? { ...p, images: data.images ?? p.images } : p)
              )
            }
            return
          }

          if (isAlreadyInFeed) return

          const { data } = await supabase
            .from('posts')
            .select(`
              id, title, content, images, is_pinned, created_at, updated_at,
              author_id, channel_id, approval_status, is_moderated, moderation_reason, likes_count,
              author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
              channel:channels(id, name, slug, description, icon)
            `)
            .eq('id', updated.id)
            .single()

          if (!data) return

          const feedPost: FeedPost = {
            id: data.id,
            channel_id: data.channel_id,
            author_id: data.author_id,
            title: data.title,
            content: data.content,
            images: data.images,
            is_pinned: data.is_pinned,
            is_moderated: data.is_moderated,
            moderation_reason: data.moderation_reason,
            approval_status: data.approval_status,
            created_at: data.created_at,
            updated_at: data.updated_at,
            author: Array.isArray(data.author) ? (data.author[0] ?? null) : (data.author ?? null),
            channel: Array.isArray(data.channel) ? (data.channel[0] ?? null) : (data.channel ?? null),
            like_count: data.likes_count ?? 0,
            comment_count: 0,
            user_has_liked: false,
            like_id: null,
          }

          setPendingNewPosts(prev => {
            // If the post is already pending (UPDATE arrived before banner was clicked),
            // replace the stale entry with the latest data including images.
            if (prev.some(p => p.id === feedPost.id)) {
              return prev.map(p => p.id === feedPost.id ? feedPost : p)
            }
            return [feedPost, ...prev]
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(subscription)
    }
  }, [allChannels])

  const flushPendingPosts = useCallback(() => {
    if (pendingNewPosts.length === 0) return
    setPostsState(current => {
      const existingIds = new Set(current.map(p => p.id))
      const unique = pendingNewPosts.filter(p => !existingIds.has(p.id))
      return [...unique, ...current]
    })
    setPostsOffset(o => o + pendingNewPosts.length)
    setPendingNewPosts([])
  }, [pendingNewPosts])

  return {
    postsState,
    hasMorePosts,
    isLoadingMorePosts,
    feedLoadError,
    loadMorePosts,
    handlePostCreated,
    handlePostDeleted,
    handlePostLikeChange,
    handlePostUpdated,
    handlePostCommentChange,
    pendingNewPostsCount: pendingNewPosts.length,
    flushPendingPosts,
  }
}