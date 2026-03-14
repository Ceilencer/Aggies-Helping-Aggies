import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/utils/api-auth'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const admin = await requireAdminUser(supabase)
    if ('error' in admin) {
      return admin.error
    }

    // Verify target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Reset both daily and monthly counters via SECURITY DEFINER function (bypasses RLS)
    const { error: resetError } = await supabase.rpc('admin_reset_post_limits', {
      p_user_id: id,
    })

    if (resetError) {
      console.error('Error resetting post limits:', JSON.stringify(resetError))
      return NextResponse.json({ error: resetError.message ?? 'Failed to reset post limits' }, { status: 500 })
    }

    // Audit log
    await supabase.from('admin_notes').insert({
      user_id: id,
      created_by: admin.user.id,
      content: `Posting limits reset by admin.`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reset post limits API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
