import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/name-change-requests
// Body: { requested_name: string }
export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const requestedName = (body?.requested_name ?? '').trim()
  const reason = (body?.reason ?? '').trim() || null

  if (!requestedName || requestedName.length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
  }
  if (requestedName.length > 100) {
    return NextResponse.json({ error: 'Name must be 100 characters or fewer' }, { status: 400 })
  }
  if (reason && reason.length > 500) {
    return NextResponse.json({ error: 'Reason must be 500 characters or fewer' }, { status: 400 })
  }

  // Fetch current name
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (requestedName === profile.full_name) {
    return NextResponse.json({ error: 'Requested name is the same as your current name' }, { status: 400 })
  }

  // Insert — will fail with 409-equivalent if there's already a pending request
  // (unique partial index: one pending per user)
  const { data, error: insertError } = await supabase
    .from('name_change_requests')
    .insert({
      user_id: user.id,
      current_name: profile.full_name,
      requested_name: requestedName,
      reason,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'You already have a pending name change request' }, { status: 409 })
    }
    console.error('Error creating name change request:', insertError)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/name-change-requests — cancel own pending request
export async function DELETE() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { error } = await supabase
    .from('name_change_requests')
    .delete()
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (error) {
    console.error('Error cancelling name change request:', error)
    return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
