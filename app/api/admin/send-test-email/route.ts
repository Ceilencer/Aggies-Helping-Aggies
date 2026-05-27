/**
 * POST /api/admin/send-test-email
 * --------------------------------
 * Sends a test version of any admin/user email template to a specified address.
 * Admin-only. Used from the admin dashboard email testing panel.
 *
 * Body: { template: string, to: string }
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  notifyNewVerificationRequest,
  notifyNewPendingPost,
  notifyNewEditRequest,
  notifyNewRingApplication,
  notifyNewReport,
  notifyUserVerificationApproved,
  notifyUserVerificationRejected,
} from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Sample data used for all test sends
const SAMPLE = {
  applicantName:  'Jordan Mitchell (Test)',
  applicantEmail: 'jordan.mitchell@tamu.edu',
  affiliation:    'Former Student',
  postTitle:      'Looking for chemistry tutor — offer $20/hr',
  authorName:     'Jordan Mitchell (Test)',
  postId:         'a3f9c821-test-0000-0000-000000000000',
  ringType:       'large',
  ringDayCycle:   'Spring 2026',
  uin:            '731024856',
  contentType:    'post' as const,
  contentId:      'a3f9c821-test-0000-0000-000000000000',
  reason:         'Spam or misleading',
  description:    'This post has been flagged multiple times this week.',
  userName:       'Jordan Mitchell (Test)',
  userEmail:      '', // filled in at send time
  reasons:        ['We could not verify your connection to Texas A&M University.', 'The information provided did not match our records.'],
}

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

  // Temporarily override ADMIN_EMAILS / user email with the requested `to` address.
  // We do this by calling the helpers with a patched version that sends to `to`.
  // Since the helpers read env vars at call time, we monkey-patch for this request.
  const originalAdminEmails = process.env.ADMIN_EMAILS
  const originalFromEmail   = process.env.FROM_EMAIL

  // Point all emails at the test recipient for this request
  process.env.ADMIN_EMAILS = to

  try {
    const now = new Date().toISOString()

    switch (template) {
      case 'verification-request':
        await notifyNewVerificationRequest({ ...SAMPLE, submittedAt: now })
        break

      case 'new-post':
        await notifyNewPendingPost({ postTitle: SAMPLE.postTitle, authorName: SAMPLE.authorName, postId: SAMPLE.postId, submittedAt: now })
        break

      case 'edit-request':
        await notifyNewEditRequest({ postTitle: SAMPLE.postTitle, authorName: SAMPLE.authorName, postId: SAMPLE.postId, submittedAt: now })
        break

      case 'ring-application':
        await notifyNewRingApplication({ ...SAMPLE, submittedAt: now })
        break

      case 'report':
        await notifyNewReport({ contentType: SAMPLE.contentType, contentId: SAMPLE.contentId, reason: SAMPLE.reason, description: SAMPLE.description, reportedAt: now })
        break

      case 'user-approved':
        // User emails send to `to` directly — patch ADMIN_EMAILS won't help here.
        // We call with userEmail = to so it goes to the tester.
        process.env.ADMIN_EMAILS = originalAdminEmails ?? ''
        await notifyUserVerificationApproved({ userEmail: to, userName: SAMPLE.userName })
        break

      case 'user-rejected':
        process.env.ADMIN_EMAILS = originalAdminEmails ?? ''
        await notifyUserVerificationRejected({ userEmail: to, userName: SAMPLE.userName, reasons: SAMPLE.reasons, isPermanentBan: false })
        break

      default:
        return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true, sentTo: to, template })
  } finally {
    // Always restore env vars
    process.env.ADMIN_EMAILS = originalAdminEmails ?? ''
    process.env.FROM_EMAIL   = originalFromEmail   ?? ''
  }
}
