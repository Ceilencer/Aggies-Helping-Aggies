import type { Post, FeedPost, Profile, Channel } from '@/lib/types'

/**
 * Hydrate a post with author and channel information for feed display
 */
export function hydratePost(
  post: Post,
  author: Profile,
  channel?: Channel
): FeedPost {
  return {
    ...post,
    author,
    channel,
    like_count: post.like_count ?? 0,
    comment_count: post.comment_count ?? 0,
    user_has_liked: post.user_has_liked ?? false,
    like_id: null,
    view_count: post.view_count ?? 0,
  }
}

/**
 * Batch hydrate multiple posts
 */
export function hydratePosts(
  posts: Post[],
  author: Profile,
  channels: Channel[]
): FeedPost[] {
  return posts.map(post => {
    const channel = channels.find(c => c.id === post.channel_id)
    return hydratePost(post, author, channel)
  })
}

/**
 * Update a post's like status
 */
export function updatePostLikeStatus(
  post: FeedPost,
  liked: boolean,
  likeId?: string | null
): FeedPost {
  return {
    ...post,
    user_has_liked: liked,
    like_id: likeId ?? null,
    like_count: liked 
      ? (post.like_count ?? 0) + 1 
      : Math.max(0, (post.like_count ?? 0) - 1),
  }
}

/**
 * Update a post's comment count
 */
export function updatePostCommentCount(
  post: FeedPost,
  increment: number = 1
): FeedPost {
  return {
    ...post,
    comment_count: Math.max(0, (post.comment_count ?? 0) + increment),
  }
}
