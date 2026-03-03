import { useCallback, useEffect, useRef, useState } from 'react'
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
      setHasMorePosts(false)
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
    const hydratedPost: FeedPost = {
      ...updatedPost,
      author: updatedPost.author || profile || undefined,
      channel: updatedPost.channel,
      like_count: updatedPost.like_count,
      comment_count: updatedPost.comment_count,
      user_has_liked: false,
      like_id: null,
    }

    setPostsState(current =>
      current.map(post => post.id === updatedPost.id ? hydratedPost : post)
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

  return {
    postsState,
    hasMorePosts,
    isLoadingMorePosts,
    loadMorePosts,
    handlePostCreated,
    handlePostDeleted,
    handlePostLikeChange,
    handlePostUpdated,
    handlePostCommentChange,
  }
}