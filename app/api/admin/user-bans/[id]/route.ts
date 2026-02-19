import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    if (profileError || !profile || profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { is_active } = await request.json()

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      )
    }

    // Update ban
    const { data: ban, error: banError } = await supabase
      .from('user_bans')
      .update({ is_active })
      .eq('id', id)
      .select(`
        *,
        user:user_id(id, email, full_name, avatar_url),
        admin:banned_by(id, email, full_name, avatar_url)
      `)
      .single()

    if (banError) throw banError

    if (!ban) {
      return NextResponse.json({ error: 'Ban not found' }, { status: 404 })
    }

    return NextResponse.json(ban)
  } catch (err) {
    console.error('Error updating ban:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    if (profileError || !profile || profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete ban (soft delete by setting is_active to false)
    const { error: banError } = await supabase
      .from('user_bans')
      .update({ is_active: false })
      .eq('id', id)

    if (banError) throw banError

    return NextResponse.json({ message: 'Ban removed successfully' })
  } catch (err) {
    console.error('Error deleting ban:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
