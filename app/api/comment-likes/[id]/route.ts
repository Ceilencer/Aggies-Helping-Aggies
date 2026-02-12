import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const likeId = id

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user owns this like
    const { data: like, error: fetchError } = await supabase
      .from('comment_likes')
      .select('user_id')
      .eq('id', likeId)
      .single()

    if (fetchError || !like) {
      return NextResponse.json(
        { error: 'Like not found' },
        { status: 404 }
      )
    }

    if (like.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete like
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('id', likeId)

    if (error) {
      console.error('Error deleting comment like:', error)
      return NextResponse.json(
        { error: 'Failed to unlike comment' },
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
