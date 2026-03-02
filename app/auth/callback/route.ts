import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAuthRoute } from '@/lib/utils/auth-routing'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

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
  const avatarUrl =
    data.user.user_metadata?.avatar_url ||
    data.user.user_metadata?.picture ||
    null

  // --- Routing decision (modular – see lib/utils/auth-routing.ts) ---
  const decision = resolveAuthRoute(provider, email)

  // --- Upsert the profile via SECURITY DEFINER RPC -------------------------
  // We call an RPC instead of a direct INSERT/UPDATE because in a Next.js
  // Route Handler the session cookies from exchangeCodeForSession are written
  // to the *response*, not back to the request, so auth.uid() is null inside
  // normal RLS-protected table operations.
  //
  // The function returns the *actual* account_status stored after the upsert
  // (never downgrades: active stays active, admin role is preserved, etc.)
  // so we can route from a single source of truth without a second DB read.
  // -------------------------------------------------------------------------
  const { data: rpcResult, error: upsertError } = await supabase.rpc(
    'upsert_profile_on_login',
    {
      p_id:             data.user.id,
      p_email:          email,
      p_full_name:      data.user.user_metadata?.full_name ||
                        data.user.user_metadata?.name ||
                        '',
      p_avatar_url:     avatarUrl ?? null,
      p_account_status: decision.accountStatus as 'active' | 'pending_approval' | 'suspended',
      p_is_verified:    decision.accountStatus === 'active',
    }
  )

  if (upsertError || !rpcResult) {
    console.error('Profile upsert error:', upsertError)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const { account_status: finalStatus, is_new_user: isNewUser, has_submitted: hasSubmitted } =
    rpcResult as { account_status: string; is_new_user: boolean; has_submitted: boolean }

  // --- Route based on the status the DB actually stored ---
  if (finalStatus === 'active') {
    return NextResponse.redirect(`${origin}/dashboard`)
  }
  if (finalStatus === 'pending_approval') {
    // New user with no questionnaire yet → fill it in
    // Returning user who already submitted → hold page
    return NextResponse.redirect(
      isNewUser || !hasSubmitted
        ? `${origin}/verification-questionnaire`
        : `${origin}/pending-approval`
    )
  }

  // suspended or any unexpected status → back to login
  return NextResponse.redirect(`${origin}/login`)
}
