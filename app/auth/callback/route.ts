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
  const avatarUrl =
    data.user.user_metadata?.avatar_url ||
    data.user.user_metadata?.picture ||
    null

  // --- Routing decision (modular – see lib/utils/auth-routing.ts) ---
  const decision = resolveAuthRoute(provider, email)

  const service = createServiceClient()

  // --- Check if this email is permanently banned BEFORE creating a profile --
  // Count rejections by email. On 2+ rejections the account is permanently
  // banned: delete the newly-created auth user and stop here.
  const { count: rejectionCount } = await service
    .from('rejected_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)

  if ((rejectionCount ?? 0) >= 2) {
    await service.auth.admin.deleteUser(data.user.id)
    return NextResponse.redirect(`${origin}/login?error=banned`)
  }

  // --- Read the pre-login profile status BEFORE the RPC runs ---------------
  // The RPC may incorrectly overwrite pending_approval → active for returning
  // users. Reading first lets us protect users already in pending/suspended
  // states from being incorrectly upgraded by the upsert.
  // -------------------------------------------------------------------------
  const { data: existingProfile } = await service
    .from('profiles')
    .select('account_status')
    .eq('id', data.user.id)
    .maybeSingle()

  const preLoginStatus = existingProfile?.account_status ?? null

  // --- Upsert the profile via SECURITY DEFINER RPC -------------------------
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

  // --- Route based on pre-login status for existing users ------------------
  // Suspended users are permanently banned — send back to login regardless.
  if (preLoginStatus === 'suspended') {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Pending users: check whether they've already submitted a questionnaire.
  // This correctly handles soft-rejected reapplicants whose verification_request
  // was deleted — they have pending_approval status but no VR row, so they
  // must fill in the questionnaire again.
  if (preLoginStatus === 'pending_approval') {
    const { data: vr } = await service
      .from('verification_requests')
      .select('id')
      .eq('user_id', data.user.id)
      .maybeSingle()
    return NextResponse.redirect(
      vr
        ? `${origin}/pending-approval`
        : `${origin}/verification-questionnaire`
    )
  }

  // New user (no pre-existing profile) or already-active user:
  // read the post-RPC status to decide where to send them.
  const { data: postRpcProfile } = await service
    .from('profiles')
    .select('account_status')
    .eq('id', data.user.id)
    .single()

  const finalStatus = postRpcProfile?.account_status ?? 'pending_approval'

  if (finalStatus === 'active') {
    return NextResponse.redirect(`${origin}/dashboard`)
  }
  if (finalStatus === 'pending_approval') {
    return NextResponse.redirect(`${origin}/verification-questionnaire`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
