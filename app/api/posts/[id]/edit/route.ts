import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { editPostSchema } from '@/lib/validations'
import { validatePost } from '@/lib/profanity-filter'
import { notifyNewEditRequest } from '@/lib/email'

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

    const { title, content, images } = validation.data

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
      .select('author_id, approval_status, title')
      .eq('id', postId)
      .single()

    if (postError || !post) {
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

    // --- ADMIN: apply edit immediately ---
    if (profile.role === 'Admin') {
      const updateFields: Record<string, unknown> = { title, content }
      if (images !== undefined) updateFields.images = images

      const { data: updatedPost, error: updateError } = await supabase
        .from('posts')
        .update(updateFields)
        .eq('id', postId)
        .select(`
          *,
          author:profiles!posts_author_id_fkey(*),
          channel:channels!inner(*)
        `)
        .single()

      if (updateError) {
        console.error('Error updating post (admin):', updateError)
        return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
      }

      return NextResponse.json(updatedPost)
    }

    // --- NON-ADMIN: store proposed edit, do NOT touch post content ---
    // Prevent submitting another edit while one is already pending
    if (post.approval_status === 'pending_edit') {
      return NextResponse.json(
        { error: 'You already have an edit pending admin review. Please wait for it to be reviewed.' },
        { status: 409 }
      )
    }

    // Upsert into post_edits (replace any stale row for this post)
    const { error: editInsertError } = await supabase
      .from('post_edits')
      .upsert(
        {
          post_id: postId,
          submitted_by: user.id,
          proposed_title: title,
          proposed_content: content,
          proposed_images: images ?? null,
        },
        { onConflict: 'post_id' }
      )

    if (editInsertError) {
      console.error('Error inserting post edit:', editInsertError)
      return NextResponse.json({ error: 'Failed to submit edit for review' }, { status: 500 })
    }

    // Flag the post as having a pending edit (does NOT change visible content).
    // approval_status is a moderation-controlled column that RLS forbids authors
    // from changing directly, so this trusted server-side write uses the
    // service-role client. Ownership was already verified above.
    const service = createServiceClient()
    const { error: statusError } = await service
      .from('posts')
      .update({ approval_status: 'pending_edit' })
      .eq('id', postId)

    if (statusError) {
      console.error('Error setting pending_edit status:', statusError)
      return NextResponse.json({ error: 'Failed to submit edit for review' }, { status: 500 })
    }

    // Record history event
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    await supabase.from('post_history').insert({
      post_id: postId,
      event_type: 'edit_submitted',
      actor_id: user.id,
      actor_name: authorProfile?.full_name ?? 'User',
    })

    // Await so Vercel doesn't kill the function before the email sends
    await notifyNewEditRequest({
      postTitle:   post.title ?? postId,
      authorName:  authorProfile?.full_name ?? 'Unknown',
      postId,
      submittedAt: new Date().toISOString(),
    })

    // Return the current (unmodified) post so the UI can update its state
    // Include pending_edit so the "View Pending Edit" button appears immediately
    const { data: currentPost } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(*),
        channel:channels!inner(*),
        pending_edit:post_edits(proposed_title, proposed_content, proposed_images)
      `)
      .eq('id', postId)
      .single()

    const pendingEdit = Array.isArray((currentPost as any)?.pending_edit)
      ? ((currentPost as any).pending_edit[0] ?? null)
      : (currentPost as any)?.pending_edit ?? null

    return NextResponse.json({ ...currentPost, pending_edit: pendingEdit, _pendingEdit: true })
  } catch (error) {
    console.error('Error in PUT /api/posts/[id]/edit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
