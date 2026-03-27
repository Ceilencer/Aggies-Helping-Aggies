'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import AggieRingIcon from '@/components/AggieRingIcon'
import Modal from '@/components/Modal'
import { Heart, Users, Lock } from 'lucide-react'

export default function FundraisingPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [pageReady, setPageReady] = useState(false)

  // Form state
  const [modalOpen, setModalOpen] = useState(false)
  const [ringType, setRingType] = useState<'large' | 'small' | ''>('')
  const [creditHours, setCreditHours] = useState('')
  const [story, setStory] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const resolvedEmail =
        user.email ??
        (user.user_metadata?.email as string | undefined) ??
        ''
      setEmail(resolvedEmail.toLowerCase().trim())
      const rawName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        ''
      const parts = rawName.trim().split(' ')
      setFirstName(parts[0] ?? '')
      setLastName(parts.slice(1).join(' '))
      setPageReady(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isTamuStudent = email.endsWith('@tamu.edu')

  const resetForm = () => {
    setRingType('')
    setCreditHours('')
    setStory('')
    setError('')
    setSubmitted(false)
    // Don't reset first/last name — they come from the user's account
  }

  const openModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!ringType) {
      setError('Please select a ring type.')
      return
    }
    const hours = Number(creditHours)
    if (!creditHours || isNaN(hours) || hours < 0 || !Number.isInteger(hours)) {
      setError('Please enter a valid number of credit hours.')
      return
    }
    if (!story.trim()) {
      setError('Please share your story.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/ring-sponsorship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          ring_type: ringType,
          credit_hours: hours,
          story: story.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Submission failed. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
              href="https://www.zeffy.com/en-US/donation-form/donate-to-aggies-helping-aggies"
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
              href="https://www.zeffy.com/en-US/donation-form/donate-to-aggies-helping-aggies"
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

        {pageReady && (
          isTamuStudent ? (
            <Button onClick={openModal}>Apply for Sponsorship</Button>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-5 flex items-start gap-3">
              <Lock size={16} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">TAMU students only</p>
                <p className="text-sm text-muted-foreground">
                  Ring sponsorship applications are only open to current Texas A&amp;M students. You
                  must be signed in with your <span className="font-mono text-xs">@tamu.edu</span> email
                  to apply. If you are a student, sign out and sign back in with your TAMU email.
                </p>
              </div>
            </div>
          )
        )}
      </section>

      {/* Currently sponsored students — placeholder */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Currently Sponsored Students</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Students whose rings are currently being sponsored by Aggies Helping Aggies.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 flex flex-col items-center justify-center text-center gap-2">
          <Users size={28} className="text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No students are currently being sponsored.</p>
        </div>
      </section>

      {/* Application modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Apply for Ring Sponsorship"
        size="md"
      >
        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-500/10 border border-green-500/30 p-4 text-sm text-green-700 dark:text-green-400">
              Your application was submitted. We will review it and be in touch. Gig &lsquo;em!
            </div>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <p className="text-sm text-muted-foreground">
              You are applying as <span className="font-medium text-foreground">{email}</span>.
            </p>

            <div className="space-y-2">
              <Label>Ring Type</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['large', 'small'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setRingType(type)}
                    className={`rounded-md border px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                      ringType === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground'
                    }`}
                  >
                    {type === 'large' ? 'Large Ring' : 'Small Ring'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  required
                  maxLength={50}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  required
                  maxLength={50}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="credit_hours">Credit Hours Completed</Label>
              <Input
                id="credit_hours"
                type="number"
                min={0}
                max={300}
                required
                value={creditHours}
                onChange={(e) => setCreditHours(e.target.value)}
                placeholder="e.g. 95"
              />
              <p className="text-xs text-muted-foreground">
                You must have at least 95 credit hours to be eligible for the Aggie Ring.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="story">Tell Us Your Story</Label>
              <Textarea
                id="story"
                required
                maxLength={1000}
                rows={5}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Share your situation and what the Aggie Ring means to you…"
              />
              <p className="text-xs text-muted-foreground text-right">{story.length}/1000</p>
            </div>

            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Application'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  )
}
