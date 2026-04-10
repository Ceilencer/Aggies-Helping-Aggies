import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdminUser } from '@/lib/utils/api-auth'

export async function POST(request: Request) {
  const supabase = await createClient()

  const admin = await requireAdminUser(supabase)
  if ('error' in admin) return admin.error

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { userId, banType, durationHours, reason } = body as {
    userId?: string
    banType?: 'temporary' | 'permanent'
    durationHours?: number
    reason?: string
  }

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  if (!banType || !['temporary', 'permanent'].includes(banType)) {
    return NextResponse.json({ error: 'Invalid ban type' }, { status: 400 })
  }

  if (banType === 'temporary' && (!durationHours || durationHours <= 0)) {
    return NextResponse.json(
      { error: 'Duration in hours must be greater than 0 for temporary bans' },
      { status: 400 }
    )
  }

  if (!reason || reason.trim().length === 0) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
  }

  try {
    const adminId = admin.user.id

    // Prevent banning other admins
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (targetProfile?.role === 'Admin') {
      return NextResponse.json({ error: 'Cannot suspend an admin account' }, { status: 403 })
    }

    // Calculate expiration time for temporary bans
    const expiresAt =
      banType === 'temporary' && durationHours
        ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
        : null

    // Create ban record
    const { data: banData, error: banError } = await supabase.from('user_bans').insert({
      user_id: userId,
      banned_by: adminId,
      ban_type: banType,
      reason: reason.trim(),
      is_active: true,
      expires_at: expiresAt,
    }).select('id').single()

    if (banError) {
      console.error('Ban creation error:', banError)
      return NextResponse.json({ error: 'Failed to create ban' }, { status: 500 })
    }

    // Update user's account_status to suspended
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ account_status: 'suspended' })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
      // Roll back the ban record to avoid inconsistent state
      await supabase.from('user_bans').delete().eq('id', banData.id)
      return NextResponse.json({ error: 'Failed to update account status' }, { status: 500 })
    }

    // Immediately invalidate all active sessions for the banned user
    const service = createServiceClient()
    await service.auth.admin.signOut(userId)

    return NextResponse.json({
      success: true,
      message: `User ${banType === 'temporary' ? `suspended for ${durationHours} hours` : 'permanently banned'}`,
    })
  } catch (error) {
    console.error('Suspension error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
