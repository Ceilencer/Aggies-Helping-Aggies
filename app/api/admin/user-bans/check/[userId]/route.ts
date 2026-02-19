import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const supabase = await createClient()

    // Check if user has an active ban
    const { data: activeBan, error } = await supabase
      .from('user_bans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`ban_type.eq.permanent,expires_at.gt.${new Date().toISOString()}`)
      .single()

    // No active ban found is not an error
    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({
      is_banned: !!activeBan,
      ban: activeBan || null,
      expires_at: activeBan?.expires_at || null,
      ban_type: activeBan?.ban_type || null,
      reason: activeBan?.reason || null,
    })
  } catch (err) {
    console.error('Error checking user ban status:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
