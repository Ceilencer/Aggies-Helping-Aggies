/**
 * POST /api/verification-requests/notify
 * ----------------------------------------
 * Called by the verification questionnaire page after a successful
 * Supabase insert. Sends an admin notification email.
 *
 * Body: { full_name, email, affiliation }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyNewVerificationRequest } from '@/lib/email'

export async function POST(request: Request) {
  // Require an authenticated session — only the submitting user can call this
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const { full_name, email, affiliation } = body ?? {}

  // Fire-and-forget — email failure should never surface to the user
  void notifyNewVerificationRequest({
    applicantName:  full_name  ?? 'Unknown',
    applicantEmail: email      ?? user.email ?? '',
    affiliation:    affiliation ?? null,
    submittedAt:    new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
