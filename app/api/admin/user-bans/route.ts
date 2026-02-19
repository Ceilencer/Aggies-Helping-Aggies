import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
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

    const { user_id, ban_type, duration_days, reason } = await request.json()

    if (!user_id || !ban_type || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, ban_type, reason' },
        { status: 400 }
      )
    }

    if (!['permanent', 'temporary'].includes(ban_type)) {
      return NextResponse.json(
        { error: 'ban_type must be "permanent" or "temporary"' },
        { status: 400 }
      )
    }

    if (ban_type === 'temporary' && (!duration_days || duration_days <= 0)) {
      return NextResponse.json(
        { error: 'duration_days is required for temporary bans and must be > 0' },
        { status: 400 }
      )
    }

    // Calculate expires_at for temporary bans
    let expiresAt = null
    if (ban_type === 'temporary') {
      const now = new Date()
      expiresAt = new Date(now.getTime() + duration_days * 24 * 60 * 60 * 1000).toISOString()
    }

    // Check if user has an active ban already
    const { data: existingBan } = await supabase
      .from('user_bans')
      .select('id')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single()

    if (existingBan) {
      // Deactivate the existing ban first
      await supabase
        .from('user_bans')
        .update({ is_active: false })
        .eq('id', existingBan.id)
    }

    // Create new ban
    const { data: ban, error: banError } = await supabase
      .from('user_bans')
      .insert({
        user_id,
        banned_by: user.id,
        ban_type,
        duration_days: ban_type === 'temporary' ? duration_days : null,
        reason,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single()

    if (banError) throw banError

    return NextResponse.json(ban, { status: 201 })
  } catch (err) {
    console.error('Error creating ban:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('user_bans')
      .select(`
        *,
        user:user_id(id, email, full_name, avatar_url),
        admin:banned_by(id, email, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: bans, error } = await query

    if (error) throw error

    return NextResponse.json(bans)
  } catch (err) {
    console.error('Error fetching bans:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
