import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyUserSchema } from '@/lib/validations'

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

  // Use service client for all operations on OTHER users' data —
  // the session client is blocked by RLS from writing to profiles it doesn't own.
  const service = createServiceClient()

  const now = new Date().toISOString()

  if (action === 'approve') {
    // Update profile → active + stamp who approved
    const { error, data: updated } = await service
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
    if (!updated || updated.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Delete the verification request
    await service.from('verification_requests').delete().eq('user_id', userId)

    return NextResponse.json({ success: true, action: 'approved' })
  }

  // action === 'reject'

  // Fetch the rejected user's email (needed for rejection count lookup)
  const { data: rejectedProfile } = await service
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()

  const rejectedEmail = rejectedProfile?.email ?? ''

  // Count prior rejections by EMAIL (user_id changes each time they re-register)
  const { count: priorRejectionCount } = await service
    .from('rejected_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('email', rejectedEmail)

  const isPermanentBan = (priorRejectionCount ?? 0) >= 1

  // Insert the rejection record BEFORE deleting the user.
  // The FK user_id → auth.users ON DELETE SET NULL means the record survives
  // after deletion with user_id = NULL, preserving email + reason + count.
  const { error: insertError } = await service.from('rejected_accounts').insert({
    user_id: userId,
    email: rejectedEmail,
    full_name: rejectedProfile?.full_name ?? '',
    rejected_by: user.id,
    rejected_at: now,
    rejection_reason: rejectionReasons ? rejectionReasons.join(' | ') : null,
  })

  if (insertError) {
    console.error('❌ rejected_accounts insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save rejection record', detail: insertError.message }, { status: 500 })
  }

  // Delete the auth user — this cascades:
  //   auth.users → profiles (ON DELETE CASCADE)
  //   profiles → verification_requests (ON DELETE CASCADE)
  //   rejected_accounts.user_id → SET NULL (record kept)
  const { error: deleteError } = await service.auth.admin.deleteUser(userId)
  if (deleteError) return NextResponse.json({ error: 'Failed to remove account' }, { status: 500 })

  return NextResponse.json({ success: true, action: 'rejected', permanent: isPermanentBan })
}
