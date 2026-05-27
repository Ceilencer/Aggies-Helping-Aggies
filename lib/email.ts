/**
 * lib/email.ts
 * -----------
 * Central email utility for Howdy Helps.
 * Uses Resend (https://resend.com) to send transactional emails.
 *
 * All functions are fire-and-forget safe — they catch their own errors
 * so a failed email never breaks the main request flow.
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * All admin recipients — comma-separated in ADMIN_EMAILS env var.
 * e.g. "cobyrafalik@aggieshelpingaggies.org,tclangford@aggieshelpingaggies.org"
 */
const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean)

const FROM_EMAIL = process.env.FROM_EMAIL ?? 'onboarding@resend.dev'
const FROM_NAME  = 'Howdy Helps'
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aggieshelpingaggies.org'

// ─── shared helpers ──────────────────────────────────────────────────────────

/** Branded HTML shell — maroon header, white body, grey footer. */
function buildHtml(title: string, body: string, isAdminAlert = true): string {
  const headerLabel = isAdminAlert ? '🤠 Howdy Helps — Admin Alert' : '🤠 Howdy Helps'
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
          <!-- Header -->
          <tr>
            <td style="background:#500000;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;">
                ${headerLabel}
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;color:#1a1a1a;">${title}</h2>
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #e5e5e5;">
              <p style="margin:0;font-size:12px;color:#888888;">
                This is an automated notification from Howdy Helps.
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

/** CTA button shared by admin alert emails. */
function adminButton(label: string, href: string): string {
  return `
    <a href="${href}"
       style="display:inline-block;padding:12px 24px;background:#500000;color:#ffffff;
              text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
      ${label} →
    </a>`
}

// ─── low-level send helpers ───────────────────────────────────────────────────

/** Send to all admin recipients. */
async function sendAdminEmail(subject: string, html: string): Promise<void> {
  if (ADMIN_EMAILS.length === 0) {
    console.warn('[email] ADMIN_EMAILS is not set — skipping admin email.')
    return
  }
  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to:   ADMIN_EMAILS,
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
  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
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
}): Promise<void> {
  const { applicantName, applicantEmail, affiliation, submittedAt } = opts
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
    buildHtml('New User Verification Request', body)
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
}): Promise<void> {
  const { postTitle, authorName, postId, submittedAt } = opts
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
    buildHtml('New Post Pending Review', body)
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
}): Promise<void> {
  const { postTitle, authorName, postId, submittedAt } = opts
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
    buildHtml('New Post Edit Request', body)
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
}): Promise<void> {
  const { applicantName, applicantEmail, ringType, ringDayCycle, uin, submittedAt } = opts
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
    buildHtml('New Ring Sponsorship Application', body)
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
}): Promise<void> {
  const { contentType, contentId, reason, description, reportedAt } = opts
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
    buildHtml(`New ${label} Report`, body)
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
      Great news — your Howdy Helps account has been <strong style="color:#16a34a;">approved!</strong>
      You can now log in and start connecting with the Aggie community.
    </p>
    <p style="color:#555555;margin:0 0 24px;">
      Welcome to the family. Gig 'em! 🤠
    </p>
    <a href="${APP_URL}/login"
       style="display:inline-block;padding:12px 24px;background:#500000;color:#ffffff;
              text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">
      Log In to Howdy Helps →
    </a>
  `

  await sendUserEmail(
    userEmail,
    'Your Howdy Helps account has been approved! 🎉',
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
      After review, we were unable to approve your Howdy Helps account application at this time.
    </p>
    ${reasonBlock}
    ${closingNote}
  `

  await sendUserEmail(
    userEmail,
    'Update on your Howdy Helps application',
    buildHtml('Application Status Update', body, false)
  )
}
