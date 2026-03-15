import Link from 'next/link'
import { TERMS_SECTIONS, TERMS_EFFECTIVE_DATE } from '@/lib/legal/terms'

export const metadata = {
  title: 'Terms and Conditions | Aggies Helping Aggies',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="https://aggieshelpingaggies.org" className="text-sm text-primary hover:underline">
            &larr; Back to home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">Terms and Conditions</h1>
        <p className="text-sm text-muted-foreground mb-10">Effective date: {TERMS_EFFECTIVE_DATE}</p>

        <div className="space-y-8">
          {TERMS_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-lg font-semibold text-foreground mb-2">{section.heading}</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                {section.content.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="whitespace-pre-line leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground">
          <p>
            Also see our{' '}
            <Link href="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
