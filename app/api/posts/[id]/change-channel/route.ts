import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { channel_id } = await request.json()

    // Validate input
    if (!channel_id) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
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

    // Check if user is an admin
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

    if (profile.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only admins can change post channels' },
        { status: 403 }
      )
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
