import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { postIdRequestSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = postIdRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Post ID is required' },
        { status: 400 }
      )
    }
    const { post_id } = validation.data

    // Get current user for like status
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch comments - likes_count is maintained by DB trigger on comment_likes
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        author_id,
        parent_comment_id,
        content,
        is_moderated,
        moderation_reason,
        created_at,
        updated_at,
        likes_count,
        author:profiles!comments_author_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('post_id', post_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    // Batch-fetch which comments the current user has liked (single query)
    const likedCommentIds = new Set<string>()
    const likeIdByCommentId = new Map<string, string>()
    if (user && comments && comments.length > 0) {
      const commentIds = comments.map((c) => c.id)
      const { data: userLikes } = await supabase
        .from('comment_likes')
        .select('id, comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds)

      userLikes?.forEach((like) => {
        likedCommentIds.add(like.comment_id)
        likeIdByCommentId.set(like.comment_id, like.id)
      })
    }

    const commentsWithLikes = (comments || []).map((comment) => ({
      ...comment,
      like_count: comment.likes_count ?? 0,
      user_has_liked: likedCommentIds.has(comment.id),
      like_id: likeIdByCommentId.get(comment.id) ?? null,
    }))

    return NextResponse.json(commentsWithLikes)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
