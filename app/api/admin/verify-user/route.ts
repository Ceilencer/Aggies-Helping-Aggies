import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyUserSchema } from '@/lib/validations'

// POST /api/admin/verify-user
// Body: { userId: string, action: 'approve' | 'reject', rejectionReason?: string }
export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify caller is an admin
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

  const { userId, action, rejectionReason } = parsed.data

  const now = new Date().toISOString()

  if (action === 'approve') {
    // 1. Update profile → active + stamp who approved
    const { error, data: updated } = await supabase
      .from('profiles')
      .update({
        account_status: 'active',
        is_verified: true,
        approved_by: user.id,
        approved_at: now,
      })
      .eq('id', userId)
      .select('id')

    if (error) return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 })
    if (!updated || updated.length === 0) return NextResponse.json({ error: 'User not found or update blocked' }, { status: 403 })

    // 2. Delete the verification request — ownership moves to profiles
    await supabase
      .from('verification_requests')
      .delete()
      .eq('user_id', userId)

    return NextResponse.json({ success: true, action: 'approved' })
  }

  // action === 'reject'

  // 1. Snapshot the questionnaire before deleting
  const { data: vr } = await supabase
    .from('verification_requests')
    .select('graduation_year, major, memorable_tradition, connection_to_tamu')
    .eq('user_id', userId)
    .single()

  // 2. Fetch rejected user's identity
  const { data: rejectedProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  // 3. Mark profile suspended
  const { error: suspendError } = await supabase
    .from('profiles')
    .update({ account_status: 'suspended' })
    .eq('id', userId)

  if (suspendError) return NextResponse.json({ error: suspendError.message }, { status: 500 })

  // 4. Insert into rejected_accounts log
  await supabase.from('rejected_accounts').insert({
    user_id: userId,
    email: rejectedProfile?.email ?? '',
    full_name: rejectedProfile?.full_name ?? '',
    rejected_by: user.id,
    rejected_at: now,
    rejection_reason: rejectionReason ?? null,
    questionnaire: vr ?? null,
  })

  // 5. Delete the verification request
  await supabase
    .from('verification_requests')
    .delete()
    .eq('user_id', userId)

  return NextResponse.json({ success: true, action: 'rejected' })
}
