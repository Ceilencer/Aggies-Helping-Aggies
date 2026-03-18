import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { commentIdRequestSchema } from '@/lib/validations'
import { requireAuthenticatedUser } from '@/lib/utils/api-auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = commentIdRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Comment ID is required' },
        { status: 400 }
      )
    }
    const { comment_id } = validation.data

    // Get current user
    const auth = await requireAuthenticatedUser(supabase)
    if ('error' in auth) return auth.error
    const { user } = auth

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
