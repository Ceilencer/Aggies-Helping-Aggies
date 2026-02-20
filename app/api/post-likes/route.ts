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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already liked this post
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingLike) {
      return NextResponse.json(
        { error: 'Already liked this post' },
        { status: 400 }
      )
    }

    // Create like
    const { data: like, error } = await supabase
      .from('post_likes')
      .insert({
        post_id,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating like:', error)
      return NextResponse.json(
        { error: 'Failed to like post' },
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
