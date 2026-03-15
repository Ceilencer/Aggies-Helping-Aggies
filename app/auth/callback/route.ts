import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveAuthRoute } from '@/lib/utils/auth-routing'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('🔴 Supabase Auth Error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Normalise email so domain checks are case-insensitive
  const email = (data.user.email ?? '').toLowerCase().trim()
  const provider = (data.user.app_metadata?.provider as string | undefined) ?? 'google'

  // --- Routing decision (modular – see lib/utils/auth-routing.ts) ---
  const decision = resolveAuthRoute(provider, email)

  const service = createServiceClient()

  // --- Permanent ban check: reject before doing anything else ----------
  const { count: rejectionCount } = await service
    .from('rejected_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)

  if ((rejectionCount ?? 0) >= 2) {
    await service.auth.admin.deleteUser(data.user.id)
    return NextResponse.redirect(`${origin}/login?error=banned`)
  }

  // --- Check for an existing profile -----------------------------------
  // Profiles only exist for approved users (and TAMU fast-track users).
  // Pending/unverified users have no profile row.
  const { data: existingProfile } = await service
    .from('profiles')
    .select('account_status')
    .eq('id', data.user.id)
    .maybeSingle()

  const preLoginStatus = existingProfile?.account_status ?? null

  // --- Existing approved/suspended user --------------------------------
  if (preLoginStatus !== null) {
    if (preLoginStatus === 'suspended') {
      return NextResponse.redirect(`${origin}/login`)
    }

    // Active returning user — update last_login via RPC and go to dashboard
    await supabase.rpc('upsert_profile_on_login', {
      p_id:             data.user.id,
      p_email:          email,
      p_full_name:      data.user.user_metadata?.full_name ||
                        data.user.user_metadata?.name ||
                        '',
      p_avatar_url:     data.user.user_metadata?.avatar_url ||
                        data.user.user_metadata?.picture ||
                        null,
      p_account_status: 'active' as const,
      p_is_verified:    true,
    })
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // --- No existing profile: TAMU fast-track ----------------------------
  // Create the profile immediately and send to dashboard.
  if (decision.accountStatus === 'active') {
    const { error: upsertError } = await supabase.rpc('upsert_profile_on_login', {
      p_id:             data.user.id,
      p_email:          email,
      p_full_name:      data.user.user_metadata?.full_name ||
                        data.user.user_metadata?.name ||
                        '',
      p_avatar_url:     data.user.user_metadata?.avatar_url ||
                        data.user.user_metadata?.picture ||
                        null,
      p_account_status: 'active' as const,
      p_is_verified:    true,
    })

    if (upsertError) {
      console.error('Profile upsert error:', upsertError)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // --- No existing profile: non-TAMU new/returning user ----------------
  // Do NOT create a profile. Route based on whether they have a pending VR.
  const { data: vr } = await service
    .from('verification_requests')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  return NextResponse.redirect(
    vr ? `${origin}/pending-approval` : `${origin}/verification-questionnaire`
  )
}
