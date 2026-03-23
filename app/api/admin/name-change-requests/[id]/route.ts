import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// PATCH /api/admin/name-change-requests/[id]
// Body: { action: 'approve' | 'deny', denial_reason?: string }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

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

  const body = await request.json()
  const { action, denial_reason } = body

  if (action !== 'approve' && action !== 'deny') {
    return NextResponse.json({ error: 'action must be "approve" or "deny"' }, { status: 400 })
  }

  const service = createServiceClient()
  const now = new Date().toISOString()

  // Fetch the request
  const { data: ncr, error: fetchError } = await service
    .from('name_change_requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'pending')
    .single()

  if (fetchError || !ncr) {
    return NextResponse.json({ error: 'Request not found or already resolved' }, { status: 404 })
  }

  if (action === 'approve') {
    // Update the profile's full_name
    const { error: profileError } = await service
      .from('profiles')
      .update({ full_name: ncr.requested_name, updated_at: now })
      .eq('id', ncr.user_id)

    if (profileError) {
      console.error('Error updating profile name:', profileError)
      return NextResponse.json({ error: 'Failed to update name' }, { status: 500 })
    }
  }

  // Mark request as resolved
  const { error: updateError } = await service
    .from('name_change_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'denied',
      reviewed_by: user.id,
      reviewed_at: now,
      denial_reason: action === 'deny' ? (denial_reason?.trim() || null) : null,
    })
    .eq('id', id)

  if (updateError) {
    console.error('Error updating name change request:', updateError)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }

  // Notify the user
  if (action === 'approve') {
    await service.from('notifications').insert({
      user_id: ncr.user_id,
      type: 'name_change_approved',
      title: 'Name change approved',
      message: `Your name has been updated to "${ncr.requested_name}".`,
      link: '/dashboard/profile',
    })
  } else {
    const denialMsg = denial_reason?.trim()
      ? `Your request to change your name to "${ncr.requested_name}" was denied. Reason: ${denial_reason.trim()}`
      : `Your request to change your name to "${ncr.requested_name}" was denied.`
    await service.from('notifications').insert({
      user_id: ncr.user_id,
      type: 'name_change_denied',
      title: 'Name change denied',
      message: denialMsg,
      link: '/dashboard/profile',
    })
  }

  return NextResponse.json({ success: true, action })
}
