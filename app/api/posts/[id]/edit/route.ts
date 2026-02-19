import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { editPostSchema } from '@/lib/validations'
import { validatePost } from '@/lib/profanity-filter'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Validate input
    const validation = editPostSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { title, content } = validation.data

    // Validate content for profanity
    const profanityCheck = validatePost(title, content)
    if (!profanityCheck.valid) {
      return NextResponse.json(
        { error: profanityCheck.error || 'Content contains inappropriate language' },
        { status: 400 }
      )
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the post to verify ownership
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single()

    if (postError) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check authorization - user must be author or admin
    if (post.author_id !== user.id && profile.role !== 'Admin') {
      return NextResponse.json(
        { error: 'You can only edit your own posts' },
        { status: 403 }
      )
    }

    // Update post - set approval_status to 'pending' if edited by non-admin
    const updateData: any = {
      title,
      content,
    }

    // If a non-admin user edits, post goes back to pending approval
    if (profile.role !== 'Admin') {
      updateData.approval_status = 'pending'
    }

    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select(`
        *,
        author:profiles!posts_author_id_fkey(*),
        channel:channels!inner(*)
      `)
      .single()

    if (updateError) {
      console.error('Error updating post:', updateError)
      return NextResponse.json(
        { error: 'Failed to update post' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedPost)
  } catch (error) {
    console.error('Error in PUT /api/posts/[id]/edit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
