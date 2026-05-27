/**
 * GET /api/email-test
 * -------------------
 * Development-only endpoint to verify Resend is configured correctly.
 * Sends a test email to ADMIN_EMAIL and returns the result.
 *
 * REMOVE or protect this route before going to production.
 */

import { NextResponse } from 'next/server'
import { notifyNewRingApplication } from '@/lib/email'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production.' }, { status: 403 })
  }

  // Send a realistic-looking test email using the ring sponsorship template
  await notifyNewRingApplication({
    applicantName:  'Test Applicant',
    applicantEmail: 'testapplicant@tamu.edu',
    ringType:       'large',
    ringDayCycle:   'Spring 2025',
    uin:            '123456789',
    submittedAt:    new Date().toISOString(),
  })

  return NextResponse.json({
    ok: true,
    message: `Test email sent to ${process.env.ADMIN_EMAIL ?? '(ADMIN_EMAIL not set)'}. Check your inbox!`,
  })
}
