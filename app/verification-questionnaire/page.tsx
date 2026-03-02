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
  const [pageReady, setPageReady] = useState(false)  // hides form until auth check is done
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    full_name: '',
    affiliation: '',          // "Student" | "Faculty" | "Parent" | "BCS Local" | "Other"
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

      // Fast-track domains should never reach this page — send straight to dashboard
      if ((user.email ?? '').toLowerCase().trim().endsWith('@tamu.edu')) {
        router.replace('/dashboard')
        return
      }

      // Check account status to guard against wrong-page navigation
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .single()

      if (profile?.account_status === 'active') {
        router.replace('/dashboard')
        return
      }

      // Returning pending user who already submitted – send to the hold page
      if (profile?.account_status === 'pending_approval') {
        const { data: existingRequest } = await supabase
          .from('verification_requests')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (existingRequest) {
          router.replace('/pending-approval')
          return
        }
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
      // Save questionnaire response
      const { error: insertError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: userId,
          email: userEmail,
          full_name: formData.full_name,
          graduation_year: formData.graduation_year,
          major: formData.major || 'N/A',
          memorable_tradition: formData.memorable_tradition,
          connection_to_tamu: formData.connection_to_tamu,
          status: 'pending',
        })

      if (insertError) throw insertError

      // Ensure profile name is up-to-date and status is pending_approval
      await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          account_status: 'pending_approval',
        })
        .eq('id', userId)

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
  // Don't render anything until the auth/profile check completes —
  // prevents a flash of the form for @tamu.edu fast-track users.
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
                {/* Full name */}
                <div className="space-y-1">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
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
                    placeholder="Computer Science"
                  />
                </div>

                {/* Memorable tradition */}
                <div className="space-y-1">
                  <Label htmlFor="memorable_tradition">
                    What is your favourite Texas A&amp;M tradition or memory?
                  </Label>
                  <Textarea
                    id="memorable_tradition"
                    name="memorable_tradition"
                    required
                    rows={3}
                    value={formData.memorable_tradition}
                    onChange={handleChange}
                    placeholder="e.g. Midnight Yell Practice, Silver Taps…"
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
                    placeholder="I graduated in 2020 and…"
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
