import { useCallback, useState } from 'react'
import type { Channel, ChannelAnnouncement, FeedPost, Post, Profile } from '@/lib/types'

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
          ? { ...section, posts: [hydratedPost, ...section.posts].slice(0, 3) }
          : section
      )
    )
  }, [allChannels, profile])

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

  return {
    sections,
    handlePostCreated,
    handlePostDeleted,
    handlePostLikeChange,
    handlePostUpdated,
    handlePostCommentChange,
    handleChannelAnnouncementChange,
  }
}
