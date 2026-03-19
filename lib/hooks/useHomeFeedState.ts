import { useCallback, useState } from 'react'
import type { Channel, ChannelAnnouncement, FeedPost, Post, Profile } from '@/lib/types'

// Max posts shown per channel section on the home page
const HOME_SECTION_LIMIT = 3



export type ChannelSection = {
  channel: Channel
  posts: FeedPost[]
  announcement: ChannelAnnouncement | null
}

type UseHomeFeedStateArgs = {
  profile: Profile | null
  channelSections: ChannelSection[]
  allChannels: Channel[]
}

export function useHomeFeedState({
  profile,
  channelSections: initialSections,
  allChannels,
}: UseHomeFeedStateArgs) {
  const [sections, setSections] = useState<ChannelSection[]>(initialSections)
  const [pendingNewPosts, setPendingNewPosts] = useState<FeedPost[]>([])

  const handlePostCreated = useCallback((newPost: Post, channel: Channel | null) => {
    const isApproved = newPost.approval_status === 'approved' || newPost.is_moderated === true
    if (!isApproved) return

    const resolvedChannel = channel || allChannels.find(c => c.id === newPost.channel_id) || undefined
    const hydratedPost: FeedPost = {
      ...newPost,
      author: profile || undefined,
      channel: resolvedChannel,
      like_count: 0,
      comment_count: 0,
      user_has_liked: false,
      like_id: null,
    }

    setSections(current =>
      current.map(section =>
        section.channel.id === newPost.channel_id
          ? { ...section, posts: [hydratedPost, ...section.posts].slice(0, HOME_SECTION_LIMIT) }
          : section
      )
    )
  }, [allChannels, profile])

  // Called by Realtime when another user's post is inserted or updated.
  // UPDATEs of already-visible posts are patched immediately (e.g. image upload).
  // New posts are held in a pending queue so they don't disrupt reading.
  const handleRealtimePost = useCallback((post: FeedPost, _isInsert: boolean) => {
    let isAlreadyVisible = false
    setSections(current =>
      current.map(section => {
        if (section.channel.id !== post.channel_id) return section
        const existingIndex = section.posts.findIndex(p => p.id === post.id)
        if (existingIndex !== -1) {
          isAlreadyVisible = true
          // UPDATE: patch in place but preserve live-tracked counts. The post UPDATE
          // may have been triggered by the comment_count DB trigger, which means the
          // fetched feedPost has comment_count: 0 (not selected). Spreading post over
          // the existing entry would reset those counts, so we keep the current values.
          const updated = section.posts.map((p, i) =>
            i === existingIndex
              ? {
                  ...p,
                  ...post,
                  // comment_count is tracked via useCommentCountRealtime — the incoming
                  // feedPost always has comment_count: 0 (not selected), so preserve ours.
                  comment_count: p.comment_count,
                  // like_count comes from posts.likes_count (updated by DB trigger on every
                  // like insert/delete) — use the incoming value so likes update live.
                  // user_has_liked / like_id are not known by the realtime hook; preserve them.
                  user_has_liked: p.user_has_liked,
                  like_id: p.like_id,
                }
              : p
          )
          return { ...section, posts: updated }
        }
        return section
      })
    )
    // Only queue genuine INSERT events. UPDATE events on non-visible posts are almost
    // always the comment_count DB trigger firing on an older post — not a new post.
    if (!isAlreadyVisible && _isInsert) {
      setPendingNewPosts(prev => {
        if (prev.some(p => p.id === post.id)) return prev.map(p => p.id === post.id ? post : p)
        return [post, ...prev]
      })
    } else if (!isAlreadyVisible && !_isInsert) {
      // UPDATE on a non-visible post — may be images uploading after the initial INSERT.
      // Patch images on any matching pending post without triggering a false bubble.
      setPendingNewPosts(prev => {
        if (!prev.some(p => p.id === post.id)) return prev
        return prev.map(p => p.id === post.id ? { ...p, images: post.images } : p)
      })
    }
  }, [])

  const flushPendingPosts = useCallback(() => {
    if (pendingNewPosts.length === 0) return
    setSections(current =>
      current.map(section => {
        const newForSection = pendingNewPosts.filter(p => p.channel_id === section.channel.id)
        if (newForSection.length === 0) return section
        const existingIds = new Set(section.posts.map(p => p.id))
        const unique = newForSection.filter(p => !existingIds.has(p.id))
        return { ...section, posts: [...unique, ...section.posts].slice(0, HOME_SECTION_LIMIT) }
      })
    )
    setPendingNewPosts([])
  }, [pendingNewPosts])

  const dismissPendingPosts = useCallback(() => {
    setPendingNewPosts([])
  }, [])

  const handlePostDeleted = useCallback((postId: string) => {
    setSections(current =>
      current.map(section => ({
        ...section,
        posts: section.posts.filter(p => p.id !== postId),
      }))
    )
  }, [])

  const handlePostLikeChange = useCallback((postId: string, likeCount: number, userHasLiked: boolean) => {
    setSections(current =>
      current.map(section => ({
        ...section,
        posts: section.posts.map(post =>
          post.id === postId
            ? { ...post, like_count: likeCount, user_has_liked: userHasLiked }
            : post
        ),
      }))
    )
  }, [])

  const handlePostUpdated = useCallback((updatedPost: Post) => {
    setSections(current =>
      current.map(section => ({
        ...section,
        posts: section.posts.map(post => {
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
        }),
      }))
    )
  }, [profile])

  const handlePostCommentChange = useCallback((postId: string, commentCount: number) => {
    setSections(current =>
      current.map(section => ({
        ...section,
        posts: section.posts.map(post =>
          post.id === postId ? { ...post, comment_count: commentCount } : post
        ),
      }))
    )
  }, [])

  const handleChannelAnnouncementChange = useCallback((channelId: string, announcement: ChannelAnnouncement | null) => {
    setSections(current =>
      current.map(section =>
        section.channel.id === channelId
          ? { ...section, announcement }
          : section
      )
    )
  }, [])

  const handlePostChannelMoved = useCallback((postId: string, newChannelId: string) => {
    const newChannel = allChannels.find(c => c.id === newChannelId)
    setSections(current =>
      current.map(section => ({
        ...section,
        posts: section.posts.map(post =>
          post.id === postId
            ? { ...post, channel_id: newChannelId, channel: newChannel }
            : post
        ),
      }))
    )
  }, [allChannels])

  return {
    sections,
    handlePostCreated,
    handlePostDeleted,
    handlePostLikeChange,
    handlePostUpdated,
    handlePostCommentChange,
    handleChannelAnnouncementChange,
    handlePostChannelMoved,
    handleRealtimePost,
    pendingNewPostsCount: pendingNewPosts.length,
    flushPendingPosts,
    dismissPendingPosts,
  }
}
