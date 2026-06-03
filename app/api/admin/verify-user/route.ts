import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyUserSchema } from '@/lib/validations'
import type { FlairType } from '@/lib/types'
import { notifyUserVerificationApproved, notifyUserVerificationRejected } from '@/lib/email'

const AFFILIATION_TO_FLAIR: Record<string, FlairType> = {
  'Student':        'Student',
  'Former Student': 'Former Student',
  'Faculty':        'Faculty',
  'Family Member':  'Family Member',
  'Aggie Mom':      'Aggie Mom',
  'BCS Local':      'BCS Local',
}

/** Minimal shape of the fields we read off a Supabase auth user. */
type AuthUserLike = {
  email?: string | null
  user_metadata?: { email?: unknown } | null
} | null | undefined

/**
 * Resolve the best email to contact a user, across every auth method:
 *   1. The verification request's stored email (set in the questionnaire)
 *   2. The auth-level email (Google / Facebook-with-email)
 *   3. The provider metadata email (phone-only Facebook, collected via
 *      /collect-email and written to user_metadata.email)
 * Returns null only for a user with no email anywhere (cannot be emailed).
 */
function resolveUserEmail(vrEmail: string | null | undefined, authUser: AuthUserLike): string | null {
  if (vrEmail && vrEmail.trim() !== '') return vrEmail.trim()
  const authEmail = authUser?.email
  if (authEmail && authEmail.trim() !== '') return authEmail.trim()
  const metaEmail = authUser?.user_metadata?.email
  if (typeof metaEmail === 'string' && metaEmail.trim() !== '') return metaEmail.trim()
  return null
}

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
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = verifyUserSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || 'Invalid request body' },
      { status: 400 }
    )
  }

  const { userId, action, rejectionReasons } = parsed.data
  const service = createServiceClient()
  const now = new Date().toISOString()

  // Atomically claim the verification request — only succeeds if still pending.
  // This prevents two admins from acting on the same application simultaneously.
  const { data: vr } = await service
    .from('verification_requests')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_by: user.id, reviewed_at: now })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .select('email, full_name, graduation_year, major, affiliation')
    .maybeSingle()

  if (!vr) {
    return NextResponse.json(
      { error: 'This application has already been reviewed by another admin' },
      { status: 409 }
    )
  }

  if (action === 'approve') {
    // Fetch avatar_url and auth-level email from auth metadata
    const { data: { user: authUser } } = await service.auth.admin.getUserById(userId)
    const avatarUrl =
      authUser?.user_metadata?.avatar_url ||
      authUser?.user_metadata?.picture ||
      null

    // Resolve the contact email across all auth methods (Google, Facebook
    // with email, phone-only Facebook). Null only if the user has no email
    // anywhere — in which case the partial unique index stays clean.
    const profileEmail = resolveUserEmail(vr?.email, authUser)

    const flair = vr?.affiliation ? (AFFILIATION_TO_FLAIR[vr.affiliation] ?? null) : null

    // Create the profile now that the user is approved
    const { error: insertError } = await service
      .from('profiles')
      .insert({
        id:             userId,
        email:          profileEmail,
        full_name:      vr?.full_name ?? '',
        avatar_url:     avatarUrl,
        flair:          flair ?? 'Student',
        graduation_year: vr?.graduation_year ?? null,
        major:          vr?.major ?? null,
        account_status: 'active',
        is_verified:    true,
        approved_by:    user.id,
        approved_at:    now,
      })

    if (insertError) {
      console.error('Profile insert error:', insertError)
      return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 })
    }

    // Delete the verification request
    await service.from('verification_requests').delete().eq('user_id', userId)

    // Await so Vercel doesn't kill the function before the email sends.
    if (profileEmail) {
      await notifyUserVerificationApproved({
        userEmail: profileEmail,
        userName:  vr?.full_name ?? 'Aggie',
      })
    } else {
      console.warn(`[verify-user] Approved user ${userId} has no email on file — approval email skipped.`)
    }

    return NextResponse.json({ success: true, action: 'approved' })
  }

  // action === 'reject'

  // Fetch the auth user to get the stable provider sub (survives deletion
  // + re-registration — the only reliable ID for phone-only Facebook users).
  const { data: { user: authUserToReject } } = await service.auth.admin.getUserById(userId)
  const providerSub  = (authUserToReject?.identities?.[0]?.identity_data?.sub as string | undefined) ?? null
  const providerName = (authUserToReject?.app_metadata?.provider as string | undefined) ?? null

  // Store null instead of '' so the email field doesn't hold a meaningless
  // empty string that could pollute future rejection-count lookups.
  const rejectedEmail = (vr?.email && vr.email !== '') ? vr.email : null

  // Count prior rejections — prefer email lookup if available, else fall
  // back to the provider sub for phone-only users whose email is unknown.
  let priorRejectionCount = 0
  if (rejectedEmail) {
    const { count } = await service
      .from('rejected_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('email', rejectedEmail)
    priorRejectionCount = count ?? 0
  } else if (providerSub) {
    const { count } = await service
      .from('rejected_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('provider_id', providerSub)
    priorRejectionCount = count ?? 0
  }

  const isPermanentBan = priorRejectionCount >= 1

  // Insert the rejection record BEFORE deleting the user.
  // FK user_id → auth.users ON DELETE SET NULL keeps the record after deletion.
  const { error: insertError } = await service.from('rejected_accounts').insert({
    user_id:          userId,
    email:            rejectedEmail,
    full_name:        vr?.full_name ?? '',
    rejected_by:      user.id,
    rejected_at:      now,
    rejection_reason: rejectionReasons ? rejectionReasons.join(' | ') : null,
    provider_id:      providerSub,
    provider:         providerName,
  })

  if (insertError) {
    console.error('❌ rejected_accounts insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save rejection record', detail: insertError.message }, { status: 500 })
  }

  // Resolve the email to NOTIFY the user. This is separate from `rejectedEmail`
  // (the dedup record above), which intentionally stays null for blank VR emails
  // to avoid polluting rejection-count lookups. For the notification we fall back
  // to the auth-level and provider metadata email so phone-only Facebook users
  // (email collected via /collect-email) and Google/Facebook users are reachable.
  const rejectNotifyEmail = resolveUserEmail(vr?.email, authUserToReject)

  // Await BEFORE deleting their auth account (we lose the email after deletion).
  if (rejectNotifyEmail) {
    await notifyUserVerificationRejected({
      userEmail:      rejectNotifyEmail,
      userName:       vr?.full_name ?? 'Applicant',
      reasons:        rejectionReasons ?? null,
      isPermanentBan,
    })
  } else {
    console.warn(`[verify-user] Rejected user ${userId} has no email on file — rejection email skipped.`)
  }

  // Delete the auth user — cascades: auth.users → verification_requests (CASCADE)
  const { error: deleteError } = await service.auth.admin.deleteUser(userId)
  if (deleteError) return NextResponse.json({ error: 'Failed to remove account' }, { status: 500 })

  return NextResponse.json({ success: true, action: 'rejected', permanent: isPermanentBan })
}
