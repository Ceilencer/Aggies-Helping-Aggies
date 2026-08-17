import AggieRingIcon from '@/components/AggieRingIcon'
import { Heart, ExternalLink, FileText, ShieldCheck } from 'lucide-react'
import { RING_APPLICATION_FORM_URL } from '@/lib/ringProgram'

const ZEFFY_DONATE_URL = 'https://www.zeffy.com/en-US/donation-form/donate-to-aggies-helping-aggies'

export default function FundraisingPage() {
  return (
    <div className="space-y-10 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Fundraising &amp; the Aggie Ring</h1>
        <p className="text-sm text-muted-foreground">
          Two ways to support the Aggie community — fund a student&apos;s ring or keep this platform running.
        </p>
      </div>

      {/* Where your support goes */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Where Your Support Goes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
              <AggieRingIcon style={{ width: 22, height: 22 }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Aggie Rings &amp; Regalia</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Help cover the cost of a student&apos;s Aggie Ring or graduation regalia — one of the
                most meaningful milestones in the Aggie tradition.
              </p>
            </div>
            <a
              href={ZEFFY_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Donate
            </a>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
              <Heart size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Keep the Platform Running</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Aggies Helping Aggies is free for everyone. Donations cover hosting and keep
                the platform available to the Aggie community at no cost.
              </p>
            </div>
            <a
              href={ZEFFY_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Donate
            </a>
          </div>

        </div>
        <p className="text-xs text-muted-foreground">
          Donations are processed securely through Zeffy. This is an independent platform and is
          not officially affiliated with Texas A&amp;M University.
        </p>
      </section>

      {/* Sponsorship application */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Apply for Ring Sponsorship</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Texas A&amp;M students in financial need can apply to have their Aggie Ring sponsored
            by Aggies Helping Aggies.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <ShieldCheck size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Your application is handled securely through Google
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The application and any sensitive documents you upload are stored in the Aggies
                Helping Aggies nonprofit Google Workspace — not on this platform — and are viewable
                only by the Ring Program review committee.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-muted/40 border border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText size={13} /> What you&apos;ll need
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Two photo IDs — driver&apos;s license/passport and TAMU student ID (redact ID numbers)</li>
              <li>Your most recent federal tax return (redact your SSN)</li>
              <li>Your last three months of bank statements (redact account numbers)</li>
              <li>Your Ring Office invoice number, if you have already ordered</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              You&apos;ll be asked to sign in to a Google account to upload documents.
            </p>
          </div>

          <a
            href={RING_APPLICATION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#500000] hover:bg-[#5f1010] text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <AggieRingIcon style={{ width: 16, height: 16 }} />
            Start Your Application
            <ExternalLink size={14} />
          </a>
        </div>

        <p className="text-xs text-muted-foreground">
          Only complete applications are reviewed. If you have questions, contact{' '}
          <a href="mailto:AggiesHelpingAggiesRings@gmail.com" className="underline hover:text-foreground">
            AggiesHelpingAggiesRings@gmail.com
          </a>.
        </p>
      </section>

    </div>
  )
}
