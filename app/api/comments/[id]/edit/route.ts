import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { editCommentSchema } from '@/lib/validations'
import { censorProfanity } from '@/lib/profanity-filter'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Validate input
    const validation = editCommentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    let { content } = validation.data

    // Optionally filter profanity in comments (can also be moderated)
    content = censorProfanity(content)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the comment to verify ownership
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', commentId)
      .single()

    if (commentError) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Check authorization - user must be author or admin
    let isAdmin = false
    if (comment.author_id !== user.id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile || profile.role !== 'Admin') {
        return NextResponse.json(
          { error: 'You can only edit your own comments' },
          { status: 403 }
        )
      }
      isAdmin = true
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select(`
        *,
        author:profiles!comments_author_id_fkey(*)
      `)
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error in PUT /api/comments/[id]/edit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
