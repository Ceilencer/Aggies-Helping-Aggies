import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { createCommentRequestSchema } from '@/lib/validations'
import { censorProfanity } from '@/lib/profanity-filter'
import { requireAuthenticatedUser } from '@/lib/utils/api-auth'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validation = createCommentRequestSchema.safeParse(body)

    // Validate input
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Post ID and content are required'
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      )
    }
    const { post_id, parent_comment_id } = validation.data
    const content = censorProfanity(validation.data.content)

    // Get current user
    const auth = await requireAuthenticatedUser(supabase)
    if ('error' in auth) return auth.error
    const { user } = auth

    // Verify the account is active and verified before allowing comments
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_verified, account_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.account_status !== 'active') {
      return NextResponse.json(
        { error: 'Your account is not active.' },
        { status: 403 }
      )
    }

    if (!profile.is_verified) {
      return NextResponse.json(
        { error: 'Your account must be verified before you can comment.' },
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

    // Send notification — fire and forget, don't block the response
    void sendCommentNotification({
      supabase,
      postId: post_id,
      parentCommentId: parent_comment_id ?? null,
      commentAuthorId: user.id,
      commentAuthorName: (comment as any).author?.full_name || 'Someone',
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function sendCommentNotification({
  supabase,
  postId,
  parentCommentId,
  commentAuthorId,
  commentAuthorName,
}: {
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
  postId: string
  parentCommentId: string | null
  commentAuthorId: string
  commentAuthorName: string
}) {
  try {
    const service = createServiceClient()

    if (parentCommentId) {
      // Reply: notify the parent comment's author
      const { data: parentComment } = await supabase
        .from('comments')
        .select('author_id')
        .eq('id', parentCommentId)
        .single()

      if (parentComment && parentComment.author_id !== commentAuthorId) {
        await service.from('notifications').insert({
          user_id: parentComment.author_id,
          type: 'comment',
          title: 'New reply to your comment',
          message: `${commentAuthorName} replied to your comment.`,
          link: '/dashboard',
        })
      }
    } else {
      // Top-level comment: notify the post's author
      const { data: post } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .single()

      if (post && post.author_id !== commentAuthorId) {
        await service.from('notifications').insert({
          user_id: post.author_id,
          type: 'comment',
          title: 'New comment on your post',
          message: `${commentAuthorName} commented on your post.`,
          link: '/dashboard',
        })
      }
    }
  } catch {
    // Notification failure should never break comment creation
  }
}
