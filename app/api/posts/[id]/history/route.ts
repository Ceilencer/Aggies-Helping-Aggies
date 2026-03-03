import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RLS on post_history handles access control (author + admins only)
    const { data, error } = await supabase
      .from('post_history')
      .select('id, event_type, actor_name, note, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching post history:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('Unexpected error fetching post history:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
