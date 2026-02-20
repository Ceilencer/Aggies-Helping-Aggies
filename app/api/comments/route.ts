import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createCommentRequestSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = createCommentRequestSchema.safeParse(body)

    // Validate input
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Post ID and content are required'
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      )
    }
    const { post_id, content, parent_comment_id } = validation.data

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id,
        author_id: user.id,
        parent_comment_id: parent_comment_id || null,
        content: content.trim(),
      })
      .select(`
        *,
        author:profiles!comments_author_id_fkey(*)
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
