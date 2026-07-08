import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import { resolveAuthRoute } from '@/lib/utils/auth-routing'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

  // Log any OAuth error returned by Supabase/Facebook so failures are diagnosable
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')
  if (oauthError) {
    console.error('OAuth callback error:', oauthError, oauthErrorDescription)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Build a Supabase client that captures cookies locally so we can stamp them
  // onto whichever NextResponse.redirect() we return. The shared createClient()
  // writes to Next.js's implicit response, which is discarded when we return an
  // explicit redirect — meaning the session cookie never reaches the browser.
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers
            .get('cookie')
            ?.split(';')
            .map((c) => {
              const [name, ...rest] = c.trim().split('=')
              return { name: name.trim(), value: rest.join('=') }
            }) ?? []
        },
        setAll(incoming: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.push(...incoming)
        },
      },
    }
  )

  // Helper: build a redirect and stamp all session cookies onto it.
  function redirectWith(url: string) {
    const res = NextResponse.redirect(url)
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('🔴 Supabase Auth Error:', error)
    return redirectWith(`${origin}/login?error=auth_failed`)
  }

  // Normalise email so domain checks are case-insensitive.
  // Facebook does not always populate data.user.email — fall back to the raw
  // identity data and user_metadata where Supabase may store it instead.
  // May still be null for Facebook accounts registered with a phone number only.
  const rawEmail = (
    data.user.email ??
    data.user.identities?.[0]?.identity_data?.email ??
    data.user.user_metadata?.email ??
    null
  )?.toLowerCase().trim() ?? null

  const email = rawEmail ?? ''
  const provider = (data.user.app_metadata?.provider as string | undefined) ?? 'google'

  // The OAuth provider's stable user ID (e.g. Facebook UID, Google sub).
  // Unlike auth.users.id, this survives user deletion + re-registration,
  // making it the only reliable identifier for phone-only users.
  const providerSub = (data.user.identities?.[0]?.identity_data?.sub as string | undefined) ?? null

  // Diagnostic: log what Facebook actually returned so we can confirm the fix.
  if (provider === 'facebook') {
    console.log('[FB OAuth] user.email:', data.user.email)
    console.log('[FB OAuth] identity_data.email:', data.user.identities?.[0]?.identity_data?.email)
    console.log('[FB OAuth] user_metadata.email:', data.user.user_metadata?.email)
    console.log('[FB OAuth] resolved rawEmail:', rawEmail)
    console.log('[FB OAuth] providerSub:', providerSub)
  }

  // --- Routing decision (modular – see lib/utils/auth-routing.ts) ---
  const decision = resolveAuthRoute(provider, email)

  const service = createServiceClient()

  // --- Permanent ban / suspend checks ---
  // Email-based checks run when we have an email (catches cross-provider
  // ban-bypass where the same person re-registers with a different provider
  // but keeps the same email address).
  if (rawEmail) {
    const { count: rejectionCount } = await service
      .from('rejected_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('email', rawEmail)

    if ((rejectionCount ?? 0) >= 2) {
      await service.auth.admin.deleteUser(data.user.id)
      return redirectWith(`${origin}/login?error=banned`)
    }

    // Guards against a banned user signing in with a different OAuth provider
    // (e.g. Google banned → tries Facebook with same email). Identity linking
    // gives the same user.id in most cases, but an email-based check ensures
    // the ban holds even if Supabase creates a new auth identity.
    const { data: suspendedByEmail } = await service
      .from('profiles')
      .select('account_status')
      .eq('email', rawEmail)
      .eq('account_status', 'suspended')
      .maybeSingle()

    if (suspendedByEmail) {
      await supabase.auth.signOut()
      return redirectWith(`${origin}/?suspended=true`)
    }
  }

  // Provider-sub-based ban check — runs for phone-only users (no email).
  // The provider sub is stable across deletion + re-registration, so
  // rejected phone-only users can still be caught on their next attempt.
  if (!rawEmail && providerSub) {
    const { count: rejectionByProvider } = await service
      .from('rejected_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', providerSub)

    if ((rejectionByProvider ?? 0) >= 2) {
      await service.auth.admin.deleteUser(data.user.id)
      return redirectWith(`${origin}/login?error=banned`)
    }
  }

  // --- Check for an existing profile -----------------------------------
  // Profiles only exist for approved users (and TAMU fast-track users).
  // Pending/unverified users have no profile row.
  const { data: existingProfile } = await service
    .from('profiles')
    .select('account_status, avatar_url')
    .eq('id', data.user.id)
    .maybeSingle()

  const preLoginStatus = existingProfile?.account_status ?? null

  // --- Existing approved/suspended user --------------------------------
  if (preLoginStatus !== null) {
    if (preLoginStatus === 'suspended') {
      await supabase.auth.signOut()
      return redirectWith(`${origin}/?suspended=true`)
    }

    // Active returning user — update last_login via RPC and go to dashboard.
    // Always prefer the fresh OAuth avatar_url (Facebook/Google CDN URLs expire),
    // falling back to the stored URL only if OAuth returns nothing.
    const newAvatar = data.user.user_metadata?.avatar_url ||
                      data.user.user_metadata?.picture ||
                      null
    await service.rpc('upsert_profile_on_login', {
      p_id:             data.user.id,
      p_email:          email,
      p_full_name:      data.user.user_metadata?.full_name ||
                        data.user.user_metadata?.name ||
                        '',
      p_avatar_url:     newAvatar ?? existingProfile?.avatar_url ?? null,
      p_account_status: 'active' as const,
      p_is_verified:    true,
    })
    return redirectWith(`${origin}/dashboard`)
  }

  // --- No existing profile: Facebook user with no email anywhere -------
  // If rawEmail is still null here, the user registered Facebook with a
  // phone number only. Route them to collect-email to provide one before
  // they can proceed to the verification questionnaire.
  // Returning approved users are already handled above (they have a profile
  // and exited at line 152), so this only affects new/pending users.
  // Note: if the user previously visited /collect-email and the API stored
  // their email in user_metadata, rawEmail would already be non-null (source
  // #3 in the resolution above) and this branch would not fire.
  if (rawEmail === null) {
    return redirectWith(`${origin}/collect-email`)
  }

  // --- No existing profile: TAMU fast-track ----------------------------
  // Create the profile immediately and send to dashboard.
  if (decision.accountStatus === 'active') {
    const { error: upsertError } = await service.rpc('upsert_profile_on_login', {
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
      return redirectWith(`${origin}/login?error=auth_failed`)
    }

    return redirectWith(`${origin}/dashboard`)
  }

  // --- No existing profile: non-TAMU new/returning user ----------------
  // Do NOT create a profile. Route based on whether they have a pending VR.
  const { data: vr } = await service
    .from('verification_requests')
    .select('id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  return redirectWith(
    vr ? `${origin}/pending-approval` : `${origin}/verification-questionnaire`
  )
}
