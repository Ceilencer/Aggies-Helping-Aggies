import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50)

    const { data: homeChannels, error: channelsError } = await supabase
      .from('channels')
      .select('id')
      .in('slug', ['general', 'promotions'])

    if (channelsError) {
      console.error('Error fetching home channels:', channelsError)
      return NextResponse.json({ error: 'Failed to load channels' }, { status: 500 })
    }

    const homeChannelIds = (homeChannels || []).map((channel) => channel.id)
    if (homeChannelIds.length === 0) {
      return NextResponse.json({ posts: [], nextOffset: offset, hasMore: false })
    }

    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(*),
        channel:channels!inner(*),
        pending_edit:post_edits(proposed_title, proposed_content)
      `)
      .in('channel_id', homeChannelIds)
      .eq('is_moderated', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (postsError) {
      console.error('Error fetching feed posts:', postsError)
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
    }

    const postIds = (postsData || []).map((post) => post.id)

    let userLikes: { id: string; post_id: string }[] = []
    let commentCountMap = new Map<string, number>()
    
    if (postIds.length > 0) {
      const [{ data: likesData, error: likesError }, { data: commentCounts, error: commentError }] = await Promise.all([
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

      if (likesError) {
        console.error('Error fetching user likes:', likesError)
      } else {
        userLikes = likesData || []
      }

      if (commentError) {
        console.error('Error fetching comment counts:', commentError)
      } else {
        commentCounts?.forEach((comment) => {
          commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) || 0) + 1)
        })
      }
    }

    const likedPostIds = new Set(userLikes.map((like) => like.post_id))
    const likeIdByPostId = new Map(userLikes.map((like) => [like.post_id, like.id]))

    const posts = (postsData || []).map((post) => ({
      ...post,
      like_count: post.likes_count ?? 0,
      comment_count: commentCountMap.get(post.id) ?? 0,
      user_has_liked: likedPostIds.has(post.id),
      like_id: likeIdByPostId.get(post.id) ?? null,
      pending_edit: Array.isArray((post as any).pending_edit) ? ((post as any).pending_edit[0] ?? null) : (post as any).pending_edit,
    }))

    return NextResponse.json({
      posts,
      nextOffset: offset + posts.length,
      hasMore: posts.length === limit,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/posts/feed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
