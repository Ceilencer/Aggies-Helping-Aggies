import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import { channelPatchRequestSchema } from '@/lib/validations'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()

    const admin = await requireAdminUser(supabase, {
      forbiddenMessage: 'Only admins can delete posts',
      profileNotFoundMessage: 'Only admins can delete posts',
      profileNotFoundStatus: 403,
    })
    if ('error' in admin) {
      return admin.error
    }

    // Delete post
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      return NextResponse.json(
        { error: 'Failed to delete post' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/posts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()
    const body = await request.json()
    const validation = channelPatchRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'channel_id is required' },
        { status: 400 }
      )
    }
    const { channel_id } = validation.data

    const admin = await requireAdminUser(supabase, {
      forbiddenMessage: 'Only admins can move posts',
      profileNotFoundMessage: 'Only admins can move posts',
      profileNotFoundStatus: 403,
    })
    if ('error' in admin) {
      return admin.error
    }

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('id', channel_id)
      .single()

    if (channelError || !channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    // Update post channel
    const { error: updateError } = await supabase
      .from('posts')
      .update({ channel_id })
      .eq('id', postId)

    if (updateError) {
      console.error('Error updating post channel:', updateError)
      return NextResponse.json(
        { error: 'Failed to update post' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/posts/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
