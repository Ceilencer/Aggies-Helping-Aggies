import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminUser } from '@/lib/utils/api-auth'

export async function POST(request: Request) {
  const supabase = await createClient()

  const admin = await requireAdminUser(supabase)
  if ('error' in admin) return admin.error

  const body = await request.json()
  const { userId, banId } = body as {
    userId?: string
    banId?: string
  }

  if (!userId || !banId) {
    return NextResponse.json({ error: 'Missing userId or banId' }, { status: 400 })
  }

  try {
    // Mark ban as inactive
    const { error: updateBanError } = await supabase
      .from('user_bans')
      .update({ is_active: false })
      .eq('id', banId)
      .eq('user_id', userId)

    if (updateBanError) {
      console.error('Ban update error:', updateBanError)
      return NextResponse.json({ error: 'Failed to remove suspension' }, { status: 500 })
    }

    // Update user's account_status back to active
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ account_status: 'active' })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json({ error: 'Failed to update account status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User unsuspended successfully',
    })
  } catch (error) {
    console.error('Unsuspension error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
