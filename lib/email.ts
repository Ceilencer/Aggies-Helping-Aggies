/**
 * lib/email.ts
 * -----------
 * Central email utility for Aggies Helping Aggies.
 * Uses Resend (https://resend.com) to send transactional emails.
 *
 * All functions are fire-and-forget safe — they catch their own errors
 * so a failed email never breaks the main request flow.
 */

import { Resend } from 'resend'

const resend  = new Resend(process.env.RESEND_API_KEY)
const FROM_NAME = 'Aggies Helping Aggies'

// APP_URL is stable across requests — fine as a module-level constant.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aggieshelpingaggies.org'

/**
 * Read FROM_EMAIL and admin recipients fresh on every call.
 * Must NOT be a module-level constant because Next.js evaluates modules at
 * build/cold-start time, so a frozen array would ignore runtime env changes.
 *
 * Accepts BOTH `ADMIN_EMAILS` (plural, current) and `ADMIN_EMAIL` (singular,
 * legacy) so a stale Vercel variable name still works. Splits on comma OR
 * semicolon and tolerates surrounding whitespace.
 */
function getEmailConfig() {
  const rawAdmins = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? ''
  return {
    fromEmail:   process.env.FROM_EMAIL ?? 'onboarding@resend.dev',
    adminEmails: rawAdmins
      .split(/[,;]/)
      .map((e) => e.trim())
      .filter(Boolean),
  }
}

// ─── shared HTML helpers ─────────────────────────────────────────────────────

/** Branded HTML shell — maroon header, white body, grey footer. */
function buildHtml(title: string, body: string, isAdminAlert = true): string {
  const headerLabel = isAdminAlert ? 'Aggies Helping Aggies — Admin Alert' : 'Aggies Helping Aggies'
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#500000;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;">${headerLabel}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">${title}</h2>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:12px;color:#888888;">
                This is an automated notification from Aggies Helping Aggies.
                Do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/** Two-column label/value row for detail tables. */
function row(label: string, value: string | number | null | undefined): string {
  const display = value != null && value !== '' ? String(value) : '—'
  return `
    <tr>
      <td style="padding:6px 12px 6px 0;font-size:13px;color:#555555;white-space:nowrap;vertical-align:top;width:160px;">
        <strong>${label}</strong>
      </td>
      <td style="padding:6px 0;font-size:13px;color:#1a1a1a;vertical-align:top;">
        ${display}
      </td>
    </tr>`
}

/** CTA button. */
function adminButton(label: string, href: string): string {
  return `
    <a href="${href}"
       style="display:inline-block;padding:12px 24px;background:#500000;color:#ffffff;
              text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
      ${label} →
    </a>`
}

// ─── low-level send helpers ───────────────────────────────────────────────────

/**
 * Send to admin recipients.
 * @param overrideTo  When provided, sends ONLY to this address instead of ADMIN_EMAILS.
 *                    Used by the email test panel so real admins are never spammed.
 */
async function sendAdminEmail(
  subject: string,
  html: string,
  overrideTo?: string,
): Promise<void> {
  const { fromEmail, adminEmails } = getEmailConfig()
  const recipients = overrideTo ? [overrideTo] : adminEmails

  if (recipients.length === 0) {
    // Diagnostic: list which email-related env KEYS are present (names only,
    // never values) so we can tell from logs whether the var is missing,
    // misnamed, or scoped to the wrong environment.
    const presentKeys = Object.keys(process.env).filter((k) =>
      /^(ADMIN_EMAIL|ADMIN_EMAILS|FROM_EMAIL|RESEND_API_KEY)$/.test(k),
    )
    console.warn(
      `[email] No admin recipients — skipping. Email env keys present: ${JSON.stringify(presentKeys)}`,
    )
    return
  }
  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to:   recipients,
      subject,
      html,
    })
    if (error) console.error('[email] Resend admin send error:', error)
  } catch (err) {
    console.error('[email] Unexpected admin send error:', err)
  }
}

/** Send to a single user email address. */
async function sendUserEmail(to: string, subject: string, html: string): Promise<void> {
  if (!to) {
    console.warn('[email] No user email provided — skipping user email.')
    return
  }
  const { fromEmail } = getEmailConfig()
  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to,
      subject,
      html,
    })
    if (error) console.error('[email] Resend user send error:', error)
  } catch (err) {
    console.error('[email] Unexpected user send error:', err)
  }
}

// ─── admin notification functions ────────────────────────────────────────────

/**
 * Fired when a new user submits a verification questionnaire.
 */
export async function notifyNewVerificationRequest(opts: {
  applicantName: string
  applicantEmail: string
  affiliation: string | null
  submittedAt?: string
  _overrideTo?: string
}): Promise<void> {
  const { applicantName, applicantEmail, affiliation, submittedAt, _overrideTo } = opts
  const date = new Date(submittedAt ?? Date.now()).toLocaleString('en-US', { timeZone: 'America/Chicago' })

  const body = `
    <p style="color:#555555;margin:0 0 20px;">
      A new user has submitted a verification questionnaire and is waiting for approval.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${row('Name',        applicantName)}
      ${row('Email',       applicantEmail)}
      ${row('Affiliation', affiliation)}
      ${row('Submitted',   date)}
    </table>
    ${adminButton('Review Verification', `${APP_URL}/dashboard/admin/pending-verifications`)}
  `

  await sendAdminEmail(
    `New Verification Request — ${applicantName}`,
    buildHtml('New User Verification Request', body),
    _overrideTo,
  )
}

/**
 * Fired when a non-admin user submits a new post (approval_status = 'pending').
 */
export async function notifyNewPendingPost(opts: {
  postTitle: string
  authorName: string
  postId: string
  submittedAt?: string
  _overrideTo?: string
}): Promise<void> {
  const { postTitle, authorName, postId, submittedAt, _overrideTo } = opts
  const date = new Date(submittedAt ?? Date.now()).toLocaleString('en-US', { timeZone: 'America/Chicago' })

  const body = `
    <p style="color:#555555;margin:0 0 20px;">
      A community member has submitted a new post that requires admin review before going live.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${row('Post Title',  postTitle)}
      ${row('Author',      authorName)}
      ${row('Post ID',     postId)}
      ${row('Submitted',   date)}
    </table>
    ${adminButton('Review Posts', `${APP_URL}/dashboard/admin`)}
  `

  await sendAdminEmail(
    `New Post Pending Review — "${postTitle}"`,
    buildHtml('New Post Pending Review', body),
    _overrideTo,
  )
}

/**
 * Fired when a user submits an edit request on an existing post.
 */
export async function notifyNewEditRequest(opts: {
  postTitle: string
  authorName: string
  postId: string
  submittedAt?: string
  _overrideTo?: string
}): Promise<void> {
  const { postTitle, authorName, postId, submittedAt, _overrideTo } = opts
  const date = new Date(submittedAt ?? Date.now()).toLocaleString('en-US', { timeZone: 'America/Chicago' })

  const body = `
    <p style="color:#555555;margin:0 0 20px;">
      A community member has submitted an edit request for one of their posts.
      The original post remains live until the edit is approved.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${row('Post Title',  postTitle)}
      ${row('Author',      authorName)}
      ${row('Post ID',     postId)}
      ${row('Submitted',   date)}
    </table>
    ${adminButton('Review Posts', `${APP_URL}/dashboard/admin`)}
  `

  await sendAdminEmail(
    `New Edit Request — "${postTitle}"`,
    buildHtml('New Post Edit Request', body),
    _overrideTo,
  )
}

/**
 * Fired when a student submits a ring sponsorship application.
 */
export async function notifyNewRingApplication(opts: {
  applicantName: string
  applicantEmail: string
  ringType: string
  ringDayCycle: string
  uin: string
  submittedAt?: string
  _overrideTo?: string
}): Promise<void> {
  const { applicantName, applicantEmail, ringType, ringDayCycle, uin, submittedAt, _overrideTo } = opts
  const date = new Date(submittedAt ?? Date.now()).toLocaleString('en-US', { timeZone: 'America/Chicago' })

  const body = `
    <p style="color:#555555;margin:0 0 20px;">
      A student has submitted a new ring sponsorship application and is awaiting admin review.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${row('Name',        applicantName)}
      ${row('Email',       applicantEmail)}
      ${row('Ring Type',   ringType === 'large' ? 'Large' : 'Small')}
      ${row('Ring Day',    ringDayCycle)}
      ${row('UIN',         uin)}
      ${row('Submitted',   date)}
    </table>
    ${adminButton('Review Application', `${APP_URL}/dashboard/admin/ring-sponsorship`)}
  `

  await sendAdminEmail(
    `New Ring Sponsorship Application — ${applicantName}`,
    buildHtml('New Ring Sponsorship Application', body),
    _overrideTo,
  )
}

/**
 * Fired when a post or comment is reported by a user.
 */
export async function notifyNewReport(opts: {
  contentType: 'post' | 'comment'
  contentId: string
  reason: string
  description?: string | null
  reportedAt?: string
  _overrideTo?: string
}): Promise<void> {
  const { contentType, contentId, reason, description, reportedAt, _overrideTo } = opts
  const label = contentType === 'post' ? 'Post' : 'Comment'
  const date = new Date(reportedAt ?? Date.now()).toLocaleString('en-US', { timeZone: 'America/Chicago' })

  const body = `
    <p style="color:#555555;margin:0 0 20px;">
      A ${contentType} has been reported by a user and requires admin review.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${row('Content Type', label)}
      ${row('Content ID',   contentId)}
      ${row('Reason',       reason)}
      ${row('Details',      description ?? null)}
      ${row('Reported At',  date)}
    </table>
    ${adminButton('Review Reported Content', `${APP_URL}/dashboard/admin/reported-posts`)}
  `

  await sendAdminEmail(
    `New ${label} Report — Reason: ${reason}`,
    buildHtml(`New ${label} Report`, body),
    _overrideTo,
  )
}

// ─── user-facing notification functions ──────────────────────────────────────

/**
 * Sent directly to the user when their verification application is approved.
 */
export async function notifyUserVerificationApproved(opts: {
  userEmail: string
  userName: string
}): Promise<void> {
  const { userEmail, userName } = opts

  const body = `
    <p style="color:#555555;margin:0 0 16px;">
      Hi ${userName},
    </p>
    <p style="color:#555555;margin:0 0 16px;">
      Great news — your Aggies Helping Aggies account has been <strong style="color:#16a34a;">approved!</strong>
      You can now log in and start connecting with the Aggie community.
    </p>
    <p style="color:#555555;margin:0 0 24px;">
      Welcome to the family. Gig 'em!
    </p>
    <a href="${APP_URL}/login"
       style="display:inline-block;padding:12px 24px;background:#500000;color:#ffffff;
              text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
      Log In to Aggies Helping Aggies →
    </a>
  `

  await sendUserEmail(
    userEmail,
    'Your Aggies Helping Aggies account has been approved! 🎉',
    buildHtml('Your Account Has Been Approved', body, false)
  )
}

/**
 * Sent directly to the user when their verification application is rejected.
 */
export async function notifyUserVerificationRejected(opts: {
  userEmail: string
  userName: string
  reasons: string[] | null
  isPermanentBan: boolean
}): Promise<void> {
  const { userEmail, userName, reasons, isPermanentBan } = opts

  const reasonBlock = reasons && reasons.length > 0
    ? `
      <p style="color:#555555;margin:0 0 8px;"><strong>Reason(s):</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#555555;">
        ${reasons.map((r) => `<li style="margin-bottom:4px;">${r}</li>`).join('')}
      </ul>`
    : ''

  const closingNote = isPermanentBan
    ? `<p style="color:#555555;margin:16px 0 0;font-size:13px;">
        As this was your second application, we are unable to accept future applications
        from this account. If you believe this was in error, please reach out to us directly.
       </p>`
    : `<p style="color:#555555;margin:16px 0 0;font-size:13px;">
        You may submit a new application addressing the reason(s) above. This will be your
        final attempt.
       </p>`

  const body = `
    <p style="color:#555555;margin:0 0 16px;">
      Hi ${userName},
    </p>
    <p style="color:#555555;margin:0 0 16px;">
      After review, we were unable to approve your Aggies Helping Aggies account application at this time.
    </p>
    ${reasonBlock}
    ${closingNote}
  `

  await sendUserEmail(
    userEmail,
    'Update on your Aggies Helping Aggies application',
    buildHtml('Application Status Update', body, false)
  )
}

// ─── test helper ─────────────────────────────────────────────────────────────

const TEST_SAMPLE = {
  applicantName:  'Jordan Mitchell (Test)',
  applicantEmail: 'jordan.mitchell@tamu.edu',
  affiliation:    'Former Student' as const,
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
  reasons:        [
    'We could not verify your connection to Texas A&M University.',
    'The information provided did not match our records.',
  ],
}

/**
 * Sends a test version of any email template to an explicit address.
 * Admin notification templates use `_overrideTo` so the real admin list is never hit.
 * User templates send directly to `to` (they already accept an explicit address).
 */
export async function sendTestEmail(template: string, to: string): Promise<void> {
  const now = new Date().toISOString()

  switch (template) {
    case 'verification-request':
      await notifyNewVerificationRequest({ ...TEST_SAMPLE, submittedAt: now, _overrideTo: to })
      break
    case 'new-post':
      await notifyNewPendingPost({ postTitle: TEST_SAMPLE.postTitle, authorName: TEST_SAMPLE.authorName, postId: TEST_SAMPLE.postId, submittedAt: now, _overrideTo: to })
      break
    case 'edit-request':
      await notifyNewEditRequest({ postTitle: TEST_SAMPLE.postTitle, authorName: TEST_SAMPLE.authorName, postId: TEST_SAMPLE.postId, submittedAt: now, _overrideTo: to })
      break
    case 'ring-application':
      await notifyNewRingApplication({ ...TEST_SAMPLE, submittedAt: now, _overrideTo: to })
      break
    case 'report':
      await notifyNewReport({ contentType: TEST_SAMPLE.contentType, contentId: TEST_SAMPLE.contentId, reason: TEST_SAMPLE.reason, description: TEST_SAMPLE.description, reportedAt: now, _overrideTo: to })
      break
    case 'user-approved':
      await notifyUserVerificationApproved({ userEmail: to, userName: TEST_SAMPLE.userName })
      break
    case 'user-rejected':
      await notifyUserVerificationRejected({ userEmail: to, userName: TEST_SAMPLE.userName, reasons: TEST_SAMPLE.reasons, isPermanentBan: false })
      break
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}
