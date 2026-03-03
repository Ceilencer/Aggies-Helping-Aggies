import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyPostsClient from '@/components/MyPostsClient'

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

  // Fetch all channels for admin menu
  const { data: channelsData } = await supabase
    .from('channels')
    .select('*')
    .order('name')
  const channels = channelsData || []

  // Fetch all posts by the logged-in user
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      channel:channels!inner(*),
      pending_edit:post_edits(proposed_title, proposed_content)
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  if (postsError) {
    console.error('Error loading posts:', postsError)
  }

  // Fetch comment counts and user like status for each post
  let postsWithCounts = postsData || []
  if (postsData && postsData.length > 0) {
    const postIds = postsData.map((post: any) => post.id)
    let likedPostIds = new Set<string>()
    let likeIdByPostId = new Map<string, string>()

    const { data: userLikes, error: userLikesError } = await supabase
      .from('post_likes')
      .select('id, post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)

    if (userLikesError) {
      console.error('Error loading user likes:', userLikesError)
    } else {
      likedPostIds = new Set((userLikes || []).map((like) => like.post_id))
      likeIdByPostId = new Map(
        (userLikes || []).map((like) => [like.post_id, like.id])
      )
    }

    let commentCountMap = new Map<string, number>()
    if (postIds.length > 0) {
      const { data: commentCounts, error: commentError } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds)

      if (!commentError && commentCounts) {
        commentCounts.forEach((comment) => {
          commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) || 0) + 1)
        })
      }
    }

    postsWithCounts = postsData.map((post: any) => ({
      ...post,
      like_count: post.likes_count ?? 0,
      comment_count: commentCountMap.get(post.id) ?? 0,
      user_has_liked: likedPostIds.has(post.id),
      like_id: likeIdByPostId.get(post.id) ?? null,
      // Supabase returns the one-to-many join as an array; flatten to a single object or null
      pending_edit: Array.isArray(post.pending_edit) ? (post.pending_edit[0] ?? null) : post.pending_edit,
    }))
  }

  const posts = postsWithCounts

  return (
    <MyPostsClient
      profile={profile}
      posts={posts}
      channels={channels}
    />
  )
}
