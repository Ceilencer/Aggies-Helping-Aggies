import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET() {
  // Verify the user's session and get their email
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // For Facebook users who registered with a phone number, user.email is null.
  // Their email is stored in user_metadata after the /collect-email step.
  const email =
    user.email ??
    (user.user_metadata?.email as string | undefined) ??
    ''

  // Use service client to bypass RLS on rejected_accounts.
  // Look up by email — the old user_id is NULL after account deletion.
  const service = createServiceClient()

  const [latestResult, countResult] = await Promise.all([
    service
      .from('rejected_accounts')
      .select('rejection_reason, rejected_at')
      .eq('email', email)
      .order('rejected_at', { ascending: false })
      .limit(1),
    service
      .from('rejected_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('email', email),
  ])

  return NextResponse.json({
    rejectionCount: countResult.count ?? 0,
    latestReason: latestResult.data?.[0]?.rejection_reason ?? null,
    latestAt: latestResult.data?.[0]?.rejected_at ?? null,
  })
}
