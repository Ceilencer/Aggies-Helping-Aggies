import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { FeedPost, FeedPostQueryRowDTO } from '@/lib/types'

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
        id, title, content, images, is_pinned, created_at, author_id, channel_id, approval_status, is_moderated, moderation_reason, likes_count,
        author:profiles!posts_author_id_fkey(id, full_name, avatar_url, role),
        channel:channels!inner(id, name, slug, description, icon),
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

    const rows = (postsData || []) as FeedPostQueryRowDTO[]
    const postIds = rows.map((post) => post.id)

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

    const posts = rows.map((post) => ({
      id: post.id,
      channel_id: post.channel_id,
      author_id: post.author_id,
      title: post.title,
      content: post.content,
      images: post.images,
      is_pinned: post.is_pinned,
      is_moderated: post.is_moderated,
      moderation_reason: post.moderation_reason,
      approval_status: post.approval_status,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: Array.isArray(post.author) ? (post.author[0] ?? null) : (post.author ?? null),
      channel: Array.isArray(post.channel) ? (post.channel[0] ?? null) : (post.channel ?? null),
      like_count: post.likes_count ?? 0,
      comment_count: commentCountMap.get(post.id) ?? 0,
      user_has_liked: likedPostIds.has(post.id),
      like_id: likeIdByPostId.get(post.id) ?? null,
      pending_edit: Array.isArray(post.pending_edit) ? (post.pending_edit[0] ?? null) : (post.pending_edit ?? null),
    })) satisfies FeedPost[]

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
