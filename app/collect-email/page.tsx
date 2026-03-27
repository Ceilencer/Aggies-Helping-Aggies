'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function CollectEmailPage() {
  const router = useRouter()
  const supabase = createClient()

  const [pageReady, setPageReady] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── on mount: verify this user actually needs to provide an email ──────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      // Resolve email the same way the auth callback does —
      // if any source already has one, this user shouldn't be here.
      const resolvedEmail =
        user.email ??
        (user.identities?.[0]?.identity_data?.email as string | undefined) ??
        (user.user_metadata?.email as string | undefined) ??
        null

      if (resolvedEmail) {
        // They already have an email; route them to the right next step.
        const { data: existingVR } = await supabase
          .from('verification_requests')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        router.replace(existingVR ? '/pending-approval' : '/verification-questionnaire')
        return
      }

      setPageReady(true)
    }
    void init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/set-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: emailInput }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      router.replace(data.hasExistingVR ? '/pending-approval' : '/verification-questionnaire')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  if (!pageReady) return null

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background-login))]">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
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
              One More Step
            </CardTitle>
            <CardDescription>
              Your Facebook account doesn&apos;t have an email address linked to
              it. Please provide one so our team can reach you about your
              application and so we can keep your account secure.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoFocus
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving…' : 'Continue'}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.href = '/login'
                  }}
                >
                  Sign out and try another way →
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <footer className="py-4 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy-policy" className="underline hover:opacity-80">
            Privacy Policy
          </Link>
          <span aria-hidden="true">&middot;</span>
          <Link href="/terms" className="underline hover:opacity-80">
            Terms and Conditions
          </Link>
        </div>
      </footer>
    </div>
  )
}
