'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const CURRENT_YEAR = new Date().getFullYear()

export default function VerificationQuestionnairePage() {
  const router = useRouter()
  const supabase = createClient()

  // ── state ──────────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [priorRejectionReason, setPriorRejectionReason] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    affiliation: '',
    graduation_year: CURRENT_YEAR,
    major: '',
    memorable_tradition: '',
    connection_to_tamu: '',
  })

  // ── load user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      setUserId(user.id)
      setUserEmail(user.email ?? '')

      // Pre-fill name from Google metadata
      if (!formData.full_name) {
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ''
        setFormData((prev) => ({ ...prev, full_name: name }))
      }

      // TAMU users should never reach this page
      if ((user.email ?? '').toLowerCase().trim().endsWith('@tamu.edu')) {
        router.replace('/dashboard')
        return
      }

      // If a profile exists and is active, the user was already approved
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.account_status === 'active') {
        router.replace('/dashboard')
        return
      }

      // If a VR already exists, the user already submitted — send to hold page
      const { data: existingVR } = await supabase
        .from('verification_requests')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingVR) {
        router.replace('/pending-approval')
        return
      }

      // Check for a prior rejection so we can show the reason as a banner
      const rejectionRes = await fetch('/api/user/rejection-status', { credentials: 'include' })
      if (rejectionRes.ok) {
        const { latestReason } = await rejectionRes.json()
        if (latestReason) setPriorRejectionReason(latestReason)
      }

      setPageReady(true)
    }
    void loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── form helpers ───────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setError('')
    setLoading(true)

    try {
      // Guard: reject if a request already exists for this user
      const { data: existingRequest } = await supabase
        .from('verification_requests')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (existingRequest) {
        setError('You already have a pending verification request. Please wait for admin review.')
        setLoading(false)
        return
      }

      // Save questionnaire response (profile is NOT updated here — created on approval)
      const { error: insertError } = await supabase
        .from('verification_requests')
        .insert({
          user_id:             userId,
          email:               userEmail,
          full_name:           formData.full_name,
          affiliation:         formData.affiliation || null,
          graduation_year:     formData.graduation_year,
          major:               formData.major || 'N/A',
          memorable_tradition: formData.memorable_tradition,
          connection_to_tamu:  formData.connection_to_tamu,
          status:              'pending',
        })

      if (insertError) throw insertError

      setSubmitted(true)
      setTimeout(() => router.replace('/pending-approval'), 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  if (!pageReady) return null

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background-login))] p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 w-16">
              <Image
                src="/images/logos/logo-no-text.svg"
                alt="Howdy Helps logo"
                width={693}
                height={500}
                className="w-full h-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-page-heading">
              Verification Questionnaire
            </CardTitle>
            <CardDescription>
              Please answer the questions below so our team can verify your
              connection to Texas A&amp;M. We&apos;ll review your submission
              and notify you by email.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submitted ? (
              <div className="rounded-md bg-green-500/10 border border-green-500/30 p-4 text-center text-green-700 dark:text-green-400">
                Questionnaire submitted! Redirecting…
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {priorRejectionReason && (
                  <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-4 text-sm space-y-1">
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Your previous application was not approved</p>
                    {priorRejectionReason.includes(' | ') ? (
                      <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-left">
                        {priorRejectionReason.split(' | ').map((r) => <li key={r}>{r}</li>)}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">Reason: {priorRejectionReason}</p>
                    )}
                    <p className="text-muted-foreground pt-1">Please address the reason above in your new submission. This is your final attempt.</p>
                  </div>
                )}
                {/* Full name */}
                <div className="space-y-1">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                {/* Affiliation */}
                <div className="space-y-1">
                  <Label htmlFor="affiliation">
                    What is your affiliation with Texas A&amp;M?
                  </Label>
                  <select
                    id="affiliation"
                    name="affiliation"
                    required
                    value={formData.affiliation}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, affiliation: e.target.value }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>Select an option…</option>
                    <option value="Student">Student</option>
                    <option value="Former Student">Former Student / Alumni</option>
                    <option value="Faculty">Faculty / Staff</option>
                    <option value="Parent">Parent / Family Member</option>
                    <option value="BCS Local">Bryan-College Station Local</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Graduation year (optional if not a student/alumni) */}
                <div className="space-y-1">
                  <Label htmlFor="graduation_year">
                    Graduation Year{' '}
                    <span className="text-muted-foreground text-xs">(if applicable)</span>
                  </Label>
                  <Input
                    id="graduation_year"
                    name="graduation_year"
                    type="number"
                    min={1876}
                    max={CURRENT_YEAR + 6}
                    value={formData.graduation_year}
                    onChange={handleChange}
                  />
                </div>

                {/* Major */}
                <div className="space-y-1">
                  <Label htmlFor="major">
                    Major / Field of Study{' '}
                    <span className="text-muted-foreground text-xs">(if applicable)</span>
                  </Label>
                  <Input
                    id="major"
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                {/* Memorable tradition */}
                <div className="space-y-1">
                  <Label htmlFor="memorable_tradition">
                    What are your favourite Texas A&amp;M traditions or memories?
                  </Label>
                  <Textarea
                    id="memorable_tradition"
                    name="memorable_tradition"
                    required
                    rows={3}
                    value={formData.memorable_tradition}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                {/* Connection */}
                <div className="space-y-1">
                  <Label htmlFor="connection_to_tamu">
                    Briefly describe your connection to Texas A&amp;M University
                  </Label>
                  <Textarea
                    id="connection_to_tamu"
                    name="connection_to_tamu"
                    required
                    rows={3}
                    value={formData.connection_to_tamu}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                {error && (
                  <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Submitting…' : 'Submit for Review'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
