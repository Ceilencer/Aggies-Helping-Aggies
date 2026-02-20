import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import { channelChangeRequestSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    const validation = channelChangeRequestSchema.safeParse(body)

    // Validate input
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Channel ID is required' },
        { status: 400 }
      )
    }
    const { channel_id } = validation.data

    const admin = await requireAdminUser(supabase, {
      forbiddenMessage: 'Only admins can change post channels',
    })
    if ('error' in admin) {
      return admin.error
    }

    // Verify post exists
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
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

    // Update post's channel
    const { error: updateError } = await supabase
      .from('posts')
      .update({ channel_id })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating post channel:', updateError)
      return NextResponse.json(
        { error: 'Failed to change channel' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
