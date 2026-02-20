import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'
import { adminPostReviewSchema } from '@/lib/validations'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validation = adminPostReviewSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message || 'Invalid request body' }, { status: 400 })
    }
    const { approve, reason } = validation.data

    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    if (approve) {
      // Mark post as approved - handle both moderation and approval status
      const approvePayload = {
        is_moderated: true,
        moderation_reason: null,
        approval_status: 'approved',
      }

      const { error } = await supabase
        .from('posts')
        .update(approvePayload)
        .eq('id', id)

      if (error) {
        const isMissingApprovalStatus =
          error.code === '42703' || error.message?.includes('approval_status')

        if (isMissingApprovalStatus) {
          const { error: fallbackError } = await supabase
            .from('posts')
            .update({ is_moderated: true, moderation_reason: null })
            .eq('id', id)

          if (fallbackError) {
            console.error('Error approving post (fallback):', fallbackError)
            return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
          }
        } else {
          console.error('Error approving post:', error)
          return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true })
    } else {
      // Deny -> mark as rejected (preserve history for user status tracking)
      const rejectPayload = {
        is_moderated: false,
        approval_status: 'rejected',
        moderation_reason: reason || 'Post did not meet community guidelines',
      }

      const { error } = await supabase
        .from('posts')
        .update(rejectPayload)
        .eq('id', id)

      if (error) {
        const isMissingApprovalStatus =
          error.code === '42703' || error.message?.includes('approval_status')

        if (isMissingApprovalStatus) {
          const { error: fallbackError } = await supabase
            .from('posts')
            .update({ is_moderated: false, moderation_reason: reason || 'Post did not meet community guidelines' })
            .eq('id', id)

          if (fallbackError) {
            console.error('Error rejecting post (fallback):', fallbackError)
            return NextResponse.json({ error: 'Failed to reject' }, { status: 500 })
          }
        } else {
          console.error('Error rejecting post:', error)
          return NextResponse.json({ error: 'Failed to reject' }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
