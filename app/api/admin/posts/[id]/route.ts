import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse, NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import { adminPostReviewSchema } from '@/lib/validations'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validation = adminPostReviewSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || 'Invalid request body' }, { status: 400 })
    }
    const { approve, reason, channel_id, duration_days } = validation.data

    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    // Determine whether this is a new-post review or an edit review
    const { data: post, error: postFetchError } = await supabase
      .from('posts')
      .select('approval_status, author_id, title, channel:channels!inner(slug)')
      .eq('id', id)
      .single()

    if (postFetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const isPendingEdit = post.approval_status === 'pending_edit'
    const serviceClient = createServiceClient()

    const channelSlug = Array.isArray(post.channel)
      ? (post.channel[0] as { slug: string } | undefined)?.slug
      : (post.channel as { slug: string } | null)?.slug

    // ── PENDING EDIT REVIEW ──────────────────────────────────────────────────
    // Fetch current admin name once for history entries
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', admin.user.id)
      .single()
    const adminName = adminProfile?.full_name ?? 'Admin'

    if (isPendingEdit) {
      // Fetch the proposed changes
      const { data: pendingEdit, error: editFetchError } = await supabase
        .from('post_edits')
        .select('proposed_title, proposed_content, proposed_images')
        .eq('post_id', id)
        .single()

      if (editFetchError || !pendingEdit) {
        // Edit row is missing — just restore approval status and return
        await supabase.from('posts').update({ approval_status: 'approved' }).eq('id', id)
        return NextResponse.json({ success: true })
      }

      if (approve) {
        // Apply the proposed edit to the live post
        const { error: applyError } = await supabase
          .from('posts')
          .update({
            title: pendingEdit.proposed_title,
            content: pendingEdit.proposed_content,
            images: pendingEdit.proposed_images ?? undefined,
            approval_status: 'approved',
            is_moderated: true,
            moderation_reason: null,
          })
          .eq('id', id)

        if (applyError) {
          console.error('Error applying post edit:', applyError)
          return NextResponse.json({ error: 'Failed to apply edit' }, { status: 500 })
        }

        await supabase.from('post_history').insert({
          post_id: id,
          event_type: 'edit_approved',
          actor_id: admin.user.id,
          actor_name: adminName,
        })

        await serviceClient.from('notifications').insert({
          user_id: post.author_id,
          type: 'edit_approved',
          title: 'Your edit was approved',
          message: `Your changes to "${post.title}" are now live.`,
          link: channelSlug ? `/dashboard/channels/${channelSlug}?post=${id}` : '/dashboard/my-posts',
        })
      } else {
        // Reject: discard proposed changes, restore post to approved (original content untouched)
        const { error: rejectStatusError } = await supabase
          .from('posts')
          .update({ approval_status: 'approved' })
          .eq('id', id)

        if (rejectStatusError) {
          console.error('Error restoring post approval status:', rejectStatusError)
          return NextResponse.json({ error: 'Failed to reject edit' }, { status: 500 })
        }

        await supabase.from('post_history').insert({
          post_id: id,
          event_type: 'edit_rejected',
          actor_id: admin.user.id,
          actor_name: adminName,
          note: reason || null,
        })

        await serviceClient.from('notifications').insert({
          user_id: post.author_id,
          type: 'edit_rejected',
          title: 'Your edit was not approved',
          message: reason
            ? `Your edit to "${post.title}" was not approved. Reason: ${reason}`
            : `Your edit to "${post.title}" was not approved.`,
          link: '/dashboard/my-posts',
        })
      }

      // Remove the pending edit row regardless of approve/reject
      await supabase.from('post_edits').delete().eq('post_id', id)

      return NextResponse.json({ success: true })
    }

    // ── NEW POST REVIEW ──────────────────────────────────────────────────────
    if (approve) {
      const updates: Record<string, unknown> = { is_moderated: true, moderation_reason: null, approval_status: 'approved' }
      if (channel_id) updates.channel_id = channel_id
      if (duration_days != null) updates.expires_at = new Date(Date.now() + duration_days * 86400 * 1000).toISOString()

      const { error } = await serviceClient
        .from('posts')
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('Error approving post:', error)
        return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
      }

      await supabase.from('post_history').insert({
        post_id: id,
        event_type: 'approved',
        actor_id: admin.user.id,
        actor_name: adminName,
      })

      let approvedChannelSlug = channelSlug
      if (channel_id) {
        const { data: newChannel } = await supabase
          .from('channels')
          .select('slug')
          .eq('id', channel_id)
          .single()
        if (newChannel) approvedChannelSlug = newChannel.slug
      }

      await serviceClient.from('notifications').insert({
        user_id: post.author_id,
        type: 'post_approved',
        title: 'Your post was approved',
        message: `"${post.title}" is now live and visible to the community.`,
        link: approvedChannelSlug ? `/dashboard/channels/${approvedChannelSlug}?post=${id}` : '/dashboard/my-posts',
      })

      return NextResponse.json({ success: true })
    } else {
      const rejectionNote = reason || 'Post did not meet community guidelines'
      const { error } = await supabase
        .from('posts')
        .update({
          is_moderated: false,
          approval_status: 'rejected',
          moderation_reason: rejectionNote,
        })
        .eq('id', id)

      if (error) {
        console.error('Error rejecting post:', error)
        return NextResponse.json({ error: 'Failed to reject' }, { status: 500 })
      }

      await supabase.from('post_history').insert({
        post_id: id,
        event_type: 'rejected',
        actor_id: admin.user.id,
        actor_name: adminName,
        note: rejectionNote,
      })

      await serviceClient.from('notifications').insert({
        user_id: post.author_id,
        type: 'post_rejected',
        title: 'Your post was not approved',
        message: `"${post.title}" was not approved. Reason: ${rejectionNote}`,
        link: '/dashboard/my-posts',
      })

      return NextResponse.json({ success: true })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
