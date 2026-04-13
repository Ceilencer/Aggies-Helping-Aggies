import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data } = await service
    .from('ring_sponsorship_applications')
    .select('status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ application: data ?? null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userEmail = (
    user.email ??
    (user.user_metadata?.email as string | undefined) ??
    ''
  ).toLowerCase().trim()

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const {
    first_name, last_name,
    phone, address_street, address_city, address_state, address_zip, uin, invoice_number,
    ring_type, credit_hours, ring_day_cycle, graduation_date, degree, major,
    family_name, family_address, family_email, family_phone,
    monthly_income, dependents_count, household_income, court_ordered_payments, monthly_obligations,
    community_involvement, university_involvement, employment_history,
    story, social_media_consent,
  } = body

  // Required field validation
  const full_name = [first_name?.trim(), last_name?.trim()].filter(Boolean).join(' ')
  if (!first_name?.trim() || !last_name?.trim()) {
    return NextResponse.json({ error: 'First and last name are required.' }, { status: 400 })
  }
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
  }
  if (!address_street?.trim() || !address_city?.trim() || !address_state?.trim() || !address_zip?.trim()) {
    return NextResponse.json({ error: 'Complete address is required.' }, { status: 400 })
  }
  if (!uin?.trim()) {
    return NextResponse.json({ error: 'UIN is required.' }, { status: 400 })
  }
  if (ring_type !== 'large' && ring_type !== 'small') {
    return NextResponse.json({ error: 'Invalid ring type.' }, { status: 400 })
  }
  if (typeof credit_hours !== 'number' || credit_hours < 0) {
    return NextResponse.json({ error: 'Invalid credit hours.' }, { status: 400 })
  }
  if (!ring_day_cycle?.trim() || !graduation_date?.trim() || !degree?.trim() || !major?.trim()) {
    return NextResponse.json({ error: 'Academic information is incomplete.' }, { status: 400 })
  }
  if (!family_name?.trim() || !family_address?.trim() || !family_email?.trim() || !family_phone?.trim()) {
    return NextResponse.json({ error: 'Family contact information is required.' }, { status: 400 })
  }
  if (typeof monthly_income !== 'number' || monthly_income < 0) {
    return NextResponse.json({ error: 'Valid monthly income is required.' }, { status: 400 })
  }
  if (typeof dependents_count !== 'number' || dependents_count < 0) {
    return NextResponse.json({ error: 'Number of dependents is required.' }, { status: 400 })
  }
  if (!employment_history?.trim()) {
    return NextResponse.json({ error: 'Employment history is required.' }, { status: 400 })
  }
  if (!story?.trim()) {
    return NextResponse.json({ error: 'Story is required.' }, { status: 400 })
  }
  if (social_media_consent !== true) {
    return NextResponse.json({ error: 'Social media consent is required.' }, { status: 400 })
  }

  // Guard: one application per user ever (regardless of status)
  const service = createServiceClient()
  const { data: existing } = await service
    .from('ring_sponsorship_applications')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'You have already submitted a ring sponsorship application.' },
      { status: 409 }
    )
  }

  const { error: insertError } = await service
    .from('ring_sponsorship_applications')
    .insert({
      user_id: user.id,
      full_name: full_name.trim(),
      email: userEmail,
      phone: phone.trim(),
      address_street: address_street.trim(),
      address_city: address_city.trim(),
      address_state: address_state.trim(),
      address_zip: address_zip.trim(),
      uin: uin.trim(),
      invoice_number: invoice_number?.trim() || null,
      ring_type,
      credit_hours,
      ring_day_cycle: ring_day_cycle.trim(),
      graduation_date: graduation_date.trim(),
      degree: degree.trim(),
      major: major.trim(),
      family_name: family_name.trim(),
      family_address: family_address.trim(),
      family_email: family_email.trim(),
      family_phone: family_phone.trim(),
      monthly_income,
      dependents_count,
      household_income: household_income ?? null,
      court_ordered_payments: court_ordered_payments?.trim() || null,
      monthly_obligations: monthly_obligations?.trim() || null,
      community_involvement: community_involvement?.trim() || null,
      university_involvement: university_involvement?.trim() || null,
      employment_history: employment_history.trim(),
      story: story.trim(),
      social_media_consent: true,
      status: 'pending',
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
