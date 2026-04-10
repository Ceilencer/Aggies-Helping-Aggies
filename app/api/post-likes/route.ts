import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { postIdRequestSchema } from '@/lib/validations'
import { requireAuthenticatedUser } from '@/lib/utils/api-auth'

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
    const auth = await requireAuthenticatedUser(supabase)
    if ('error' in auth) return auth.error
    const { user } = auth

    // Check if user already liked this post
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingLike) {
      return NextResponse.json({ error: 'Already liked this post' }, { status: 409 })
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
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already liked this post' }, { status: 409 })
      }
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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const postId = request.nextUrl.searchParams.get('post_id')

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const auth = await requireAuthenticatedUser(supabase)
    if ('error' in auth) return auth.error
    const { user } = auth

    const { data: like, error: fetchError } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Error fetching like to delete:', fetchError)
      return NextResponse.json(
        { error: 'Failed to unlike post' },
        { status: 500 }
      )
    }

    if (!like) {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    const { error: deleteError } = await supabase
      .from('post_likes')
      .delete()
      .eq('id', like.id)

    if (deleteError) {
      console.error('Error deleting like:', deleteError)
      return NextResponse.json(
        { error: 'Failed to unlike post' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
