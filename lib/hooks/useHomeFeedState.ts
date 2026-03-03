import { useCallback, useState } from 'react'
import type { Channel, FeedPost, Post, Profile } from '@/lib/types'

const HOME_FEED_PAGE_SIZE = 5

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
  const [hasMorePosts, setHasMorePosts] = useState(posts.length > 0)
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false)

  const loadMorePosts = useCallback(async () => {
    if (isLoadingMorePosts || !hasMorePosts) {
      return
    }

    setIsLoadingMorePosts(true)
    try {
      const response = await fetch(`/api/posts/feed?offset=${postsOffset}&limit=${HOME_FEED_PAGE_SIZE}`, {
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
      if (incomingPosts.length > 0) {
        setPostsState((current) => {
          const existingIds = new Set(current.map(post => post.id))
          const uniqueIncoming = incomingPosts.filter(post => !existingIds.has(post.id))
          return uniqueIncoming.length > 0 ? [...current, ...uniqueIncoming] : current
        })
      }

      setPostsOffset(typeof data.nextOffset === 'number' ? data.nextOffset : postsOffset + incomingPosts.length)
      setHasMorePosts(data.hasMore === true)
    } catch (error) {
      console.error('Error loading more home feed posts:', error)
      setHasMorePosts(false)
    } finally {
      setIsLoadingMorePosts(false)
    }
  }, [hasMorePosts, isLoadingMorePosts, postsOffset])

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