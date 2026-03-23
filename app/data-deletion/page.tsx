import Link from 'next/link'

export const metadata = {
  title: 'Data Deletion | Aggies Helping Aggies',
}

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="https://aggieshelpingaggies.org" className="text-sm text-primary hover:underline">
            &larr; Back to home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">Data Deletion Request</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-muted-foreground leading-relaxed">

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">How to Delete Your Data</h2>
            <p>
              If you signed in to Howdy Helps using Facebook, you can request deletion of your account
              and all associated data at any time. Deleting your account permanently removes your profile,
              posts, comments, and any other data we hold about you.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Option 1 — Delete Your Account Directly</h2>
            <p>
              Log in to Howdy Helps, navigate to your <strong className="text-foreground">Profile Settings</strong>,
              and select <strong className="text-foreground">Delete Account</strong>. Your account and all
              associated data will be permanently deleted within 30 days.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Option 2 — Contact Us</h2>
            <p>
              If you no longer have access to your account or need assistance, email us at{' '}
              <a
                href="mailto:support@aggieshelpingaggies.org"
                className="text-primary hover:underline"
              >
                support@aggieshelpingaggies.org
              </a>{' '}
              with the subject line <strong className="text-foreground">"Data Deletion Request"</strong>.
              Include the email address or Facebook account associated with your Howdy Helps account.
              We will complete your request within 30 days.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">What Gets Deleted</h2>
            <p>When your account is deleted, we permanently remove:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Your profile information (name, bio, photo)</li>
              <li>All posts and comments you have created</li>
              <li>Your notification history</li>
              <li>Any account preferences or settings</li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground">
          <p>
            Also see our{' '}
            <Link href="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Terms and Conditions
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
