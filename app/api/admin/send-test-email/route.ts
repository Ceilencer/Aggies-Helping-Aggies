/**
 * POST /api/admin/send-test-email
 * --------------------------------
 * Sends a test version of any email template to a specified address.
 * Admin-only. Used from the admin dashboard email testing panel.
 *
 * Body: { template: string, to: string }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTestEmail } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const { template, to } = body ?? {}

  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: 'A valid recipient email is required.' }, { status: 400 })
  }
  if (!template) {
    return NextResponse.json({ error: 'A template name is required.' }, { status: 400 })
  }

  try {
    await sendTestEmail(template, to)
    return NextResponse.json({ ok: true, sentTo: to, template })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
