import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Basic email format check — full validation happens at the auth/DB layer.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  // 1. Verify the caller has a valid session.
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse and validate the submitted email.
  const body = await request.json().catch(() => null)
  const providedEmail = (body?.email ?? '').toLowerCase().trim()

  if (!providedEmail || !EMAIL_RE.test(providedEmail)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 }
    )
  }

  const service = createServiceClient()

  // 3. Duplicate check — ensure no other active profile already owns this email.
  const { data: conflict } = await service
    .from('profiles')
    .select('id')
    .eq('email', providedEmail)
    .eq('account_status', 'active')
    .neq('id', user.id)
    .maybeSingle()

  if (conflict) {
    return NextResponse.json(
      {
        error:
          'An active account already exists with that email address. ' +
          'Try signing in with Google instead.',
      },
      { status: 409 }
    )
  }

  // 4. Merge the email into user_metadata — preserving all existing fields
  //    (avatar_url, full_name, etc.) so nothing is lost.
  //    This does NOT change user.email (the auth-level field), which would
  //    trigger a confirmation email. The auth callback already reads
  //    user_metadata.email as a fallback, so next login it will be found.
  const existingMeta = user.user_metadata ?? {}
  const { error: updateError } = await service.auth.admin.updateUserById(user.id, {
    user_metadata: { ...existingMeta, email: providedEmail },
  })

  if (updateError) {
    console.error('[set-email] admin.updateUserById failed:', updateError)
    return NextResponse.json(
      { error: 'Failed to save your email. Please try again.' },
      { status: 500 }
    )
  }

  // 5. Patch any existing VR row saved with a blank email (defensive — handles
  //    the edge case where a VR was somehow created before collect-email ran).
  await service
    .from('verification_requests')
    .update({ email: providedEmail })
    .eq('user_id', user.id)
    .eq('email', '')

  // 6. Tell the client whether a pending VR already exists so it can route
  //    the user to /pending-approval vs /verification-questionnaire.
  const { data: existingVR } = await service
    .from('verification_requests')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ hasExistingVR: !!existingVR })
}
