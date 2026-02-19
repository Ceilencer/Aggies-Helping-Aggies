import { createClient } from '@/lib/supabase/server'
import { checkUserBan } from '@/lib/supabase/ban-utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { post_id, content, parent_comment_id } = await request.json()

    // Validate input
    if (!post_id || !content?.trim()) {
      return NextResponse.json(
        { error: 'Post ID and content are required' },
        { status: 400 }
      )
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Comment must be 1000 characters or less' },
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

    // Check if user is banned
    const { isBanned, ban } = await checkUserBan(user.id, supabase)
    if (isBanned) {
      const banMessage = ban.ban_type === 'permanent'
        ? `You are permanently banned from this platform. Reason: ${ban.reason}`
        : `You are temporarily banned from this platform. Reason: ${ban.reason}`
      
      return NextResponse.json(
        { error: banMessage },
        { status: 403 }
      )
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id,
        author_id: user.id,
        parent_comment_id: parent_comment_id || null,
        content: content.trim(),
      })
      .select(`
        *,
        author:profiles!comments_author_id_fkey(*)
      `)
      .single()

    if (error) {
      console.error('Error creating comment:', error)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
