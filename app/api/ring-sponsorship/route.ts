import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Enforce TAMU-only server-side — client check alone is not sufficient
  const userEmail = (
    user.email ??
    (user.user_metadata?.email as string | undefined) ??
    ''
  ).toLowerCase().trim()

  if (!userEmail.endsWith('@tamu.edu')) {
    return NextResponse.json(
      { error: 'Ring sponsorship applications are only open to Texas A&M students.' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { first_name, last_name, ring_type, credit_hours, story } = body
  const full_name = [first_name?.trim(), last_name?.trim()].filter(Boolean).join(' ')

  if (!first_name?.trim() || !last_name?.trim() || !story?.trim()) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (ring_type !== 'large' && ring_type !== 'small') {
    return NextResponse.json({ error: 'Invalid ring type.' }, { status: 400 })
  }
  if (typeof credit_hours !== 'number' || credit_hours < 0) {
    return NextResponse.json({ error: 'Invalid credit hours.' }, { status: 400 })
  }

  // Guard: one pending application per user
  const service = createServiceClient()
  const { data: existing } = await service
    .from('ring_sponsorship_applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'You already have a pending sponsorship application.' },
      { status: 409 }
    )
  }

  const { error: insertError } = await service
    .from('ring_sponsorship_applications')
    .insert({
      user_id:      user.id,
      full_name:    full_name.trim(),
      email:        userEmail,
      credit_hours,
      ring_type,
      story:        story.trim(),
      status:       'pending',
    })

  if (insertError) {
    console.error('Ring sponsorship insert error:', insertError)
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
