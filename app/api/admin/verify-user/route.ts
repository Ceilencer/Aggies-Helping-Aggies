import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyUserSchema } from '@/lib/validations'
import type { FlairType } from '@/lib/types'

const AFFILIATION_TO_FLAIR: Record<string, FlairType> = {
  'Student':        'Student',
  'Former Student': 'Former Student',
  'Faculty':        'Faculty',
  'Family Member':  'Family Member',
  'Aggie Mom':      'Aggie Mom',
  'BCS Local':      'BCS Local',
}

// POST /api/admin/verify-user
// Body: { userId: string, action: 'approve' | 'reject', rejectionReasons?: string[] }
export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify caller is an admin (use session client to read own profile)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse and validate body
  const parsed = verifyUserSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || 'Invalid request body' },
      { status: 400 }
    )
  }

  const { userId, action, rejectionReasons } = parsed.data
  const service = createServiceClient()
  const now = new Date().toISOString()

  // Fetch the verification request — needed by both approve and reject paths
  const { data: vr } = await service
    .from('verification_requests')
    .select('email, full_name, graduation_year, major, affiliation')
    .eq('user_id', userId)
    .single()

  if (action === 'approve') {
    // Fetch avatar_url from auth metadata
    const { data: { user: authUser } } = await service.auth.admin.getUserById(userId)
    const avatarUrl =
      authUser?.user_metadata?.avatar_url ||
      authUser?.user_metadata?.picture ||
      null

    const flair = vr?.affiliation ? (AFFILIATION_TO_FLAIR[vr.affiliation] ?? null) : null

    // Create the profile now that the user is approved
    const { error: insertError } = await service
      .from('profiles')
      .insert({
        id:             userId,
        email:          vr?.email ?? '',
        full_name:      vr?.full_name ?? '',
        avatar_url:     avatarUrl,
        flair:          flair ?? 'Student',
        graduation_year: vr?.graduation_year ?? null,
        major:          vr?.major ?? null,
        account_status: 'active',
        is_verified:    true,
        approved_by:    user.id,
        approved_at:    now,
      })

    if (insertError) {
      console.error('Profile insert error:', insertError)
      return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 })
    }

    // Delete the verification request
    await service.from('verification_requests').delete().eq('user_id', userId)

    return NextResponse.json({ success: true, action: 'approved' })
  }

  // action === 'reject'

  const rejectedEmail = vr?.email ?? ''

  // Count prior rejections by EMAIL (user_id changes each time they re-register)
  const { count: priorRejectionCount } = await service
    .from('rejected_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('email', rejectedEmail)

  const isPermanentBan = (priorRejectionCount ?? 0) >= 1

  // Insert the rejection record BEFORE deleting the user.
  // FK user_id → auth.users ON DELETE SET NULL keeps the record after deletion.
  const { error: insertError } = await service.from('rejected_accounts').insert({
    user_id:          userId,
    email:            rejectedEmail,
    full_name:        vr?.full_name ?? '',
    rejected_by:      user.id,
    rejected_at:      now,
    rejection_reason: rejectionReasons ? rejectionReasons.join(' | ') : null,
  })

  if (insertError) {
    console.error('❌ rejected_accounts insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save rejection record', detail: insertError.message }, { status: 500 })
  }

  // Delete the auth user — cascades: auth.users → verification_requests (CASCADE)
  const { error: deleteError } = await service.auth.admin.deleteUser(userId)
  if (deleteError) return NextResponse.json({ error: 'Failed to remove account' }, { status: 500 })

  return NextResponse.json({ success: true, action: 'rejected', permanent: isPermanentBan })
}
