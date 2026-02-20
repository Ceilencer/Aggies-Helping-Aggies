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

    // Fetch comments with like counts
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

    // Get like counts for each comment
    const commentsWithLikes = await Promise.all(
      (comments || []).map(async (comment) => {
        const { count: like_count } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id)

        let user_has_liked = false
        if (user) {
          const { data: userLike } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', user.id)
            .maybeSingle()
          user_has_liked = !!userLike
        }

        return {
          ...comment,
          like_count: like_count || 0,
          user_has_liked,
        }
      })
    )

    return NextResponse.json(commentsWithLikes)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
