import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { comment_id } = await request.json()

    if (!comment_id) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
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

    // Check if user already liked this comment
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', comment_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingLike) {
      return NextResponse.json(
        { error: 'Already liked this comment' },
        { status: 400 }
      )
    }

    // Create like
    const { data: like, error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating comment like:', error)
      return NextResponse.json(
        { error: 'Failed to like comment' },
        { status: 500 }
      )
    }

    return NextResponse.json(like, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
