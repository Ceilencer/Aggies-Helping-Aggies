import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyPostsClient from '@/components/MyPostsClient'
import type { FeedPostQueryRowDTO, FeedPost } from '@/lib/types'

export default async function MyPostsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to landing if not authenticated
  if (!user) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const profile = profileData

  // Fetch all channels for admin menu (lightweight DTO)
  const { data: channelsData } = await supabase
    .from('channels')
    .select('id, name, slug, description, icon, is_read_only')
    .order('name')
  const channels = channelsData || []

  // Fetch all posts by the logged-in user (DTO-typed query)
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      images,
      is_pinned,
      is_moderated,
      moderation_reason,
      approval_status,
      created_at,
      updated_at,
      author_id,
      channel_id,
      likes_count,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
      channel:channels!inner(id, name, slug),
      pending_edit:post_edits(proposed_title, proposed_content)
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  if (postsError) {
    console.error('Error loading posts:', postsError)
  }

  // Normalize and hydrate posts with counts
  const rows = (postsData || []) as FeedPostQueryRowDTO[]
  
  let posts: FeedPost[] = []
  if (rows.length > 0) {
    const postIds = rows.map((post) => post.id)

    // Fetch likes and comments in parallel
    const [likesResult, commentsResult] = await Promise.all([
      supabase
        .from('post_likes')
        .select('id, post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds),
      supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds)
    ])

    const userLikes = likesResult.data || []
    const commentCounts = commentsResult.data || []
    
    const likedPostIds = new Set(userLikes.map((like) => like.post_id))
    const likeIdByPostId = new Map(userLikes.map((like) => [like.post_id, like.id]))

    const commentCountMap = new Map<string, number>()
    commentCounts.forEach((comment) => {
      commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) || 0) + 1)
    })

    // Map to FeedPost with normalized relations
    posts = rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      images: row.images,
      is_pinned: row.is_pinned,
      is_moderated: row.is_moderated,
      moderation_reason: row.moderation_reason,
      approval_status: row.approval_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author_id: row.author_id,
      channel_id: row.channel_id,
      like_count: row.likes_count ?? 0,
      comment_count: commentCountMap.get(row.id) ?? 0,
      user_has_liked: likedPostIds.has(row.id),
      like_id: likeIdByPostId.get(row.id) ?? null,
      author: Array.isArray(row.author) ? (row.author[0] ?? null) : (row.author ?? null),
      channel: Array.isArray(row.channel) ? row.channel[0] : row.channel,
      pending_edit: Array.isArray(row.pending_edit) ? (row.pending_edit[0] ?? null) : (row.pending_edit ?? null),
    }))
  }

  return (
    <MyPostsClient
      userId={user.id}
      profile={profile}
      posts={posts}
      channels={channels}
    />
  )
}
