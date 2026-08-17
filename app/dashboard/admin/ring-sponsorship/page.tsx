import { ExternalLink, FolderOpen, ShieldCheck } from 'lucide-react'
import { RING_SUBMISSIONS_FOLDER_URL } from '@/lib/ringProgram'

export default function RingSponsorshipPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Ring Sponsorship Applications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Applications are collected and stored in the Aggies Helping Aggies Google Workspace.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Reviewed in Google Drive</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each submission creates a folder named <span className="font-mono">LastName.FirstName Ring
              Cycle &lt;year&gt;</span> containing the applicant&apos;s documents and a questionnaire PDF.
              Access is limited to the Ring Program committee. Sensitive financial documents are never
              stored on this platform.
            </p>
          </div>
        </div>

        <a
          href={RING_SUBMISSIONS_FOLDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-[#500000] hover:bg-[#5f1010] text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <FolderOpen size={16} />
          Open Ring Submissions in Drive
          <ExternalLink size={14} />
        </a>

        <p className="text-xs text-muted-foreground">
          You must be signed in with an <span className="font-medium">@aggieshelpingaggies</span> account
          that belongs to the Ring committee group to view submissions.
        </p>
      </div>
    </div>
  )
}
