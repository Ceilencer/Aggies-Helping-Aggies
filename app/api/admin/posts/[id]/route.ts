import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { approve } = body as { approve?: boolean }

    const supabase = await createClient()

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (approve) {
      // Mark post as moderated/approved
      const { error } = await supabase
        .from('posts')
        .update({ is_moderated: true, moderation_reason: null })
        .eq('id', id)

      if (error) {
        console.error('Error approving post:', error)
        return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } else {
      // Deny -> delete post
      const { error } = await supabase.from('posts').delete().eq('id', id)
      if (error) {
        console.error('Error deleting post:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
