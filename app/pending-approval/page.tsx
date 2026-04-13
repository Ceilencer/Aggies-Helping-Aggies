'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function PendingApprovalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [realtimeOk, setRealtimeOk] = useState(true)
  const handleCheckStatusRef = useRef<() => Promise<void>>(async () => {})

  const fetchRejectionStatus = async () => {
    const res = await fetch('/api/user/rejection-status', { credentials: 'include' })
    if (!res.ok) return
    const { rejectionCount, latestReason } = await res.json()
    if (rejectionCount > 0) {
      setRejectionReason(latestReason ?? 'No reason provided')
    }
  }

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      setEmail(user.email ?? '')

      // Pending users have no profile row. A profile only exists once approved.
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.account_status === 'active') {
        router.replace('/dashboard')
        return
      }

      // Only show rejection status if the user has no active pending VR.
      // If they just re-submitted, their new VR takes precedence and the
      // page should show "Verification Pending", not "Application Not Approved".
      const { data: activeVR } = await supabase
        .from('verification_requests')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!activeVR) {
        await fetchRejectionStatus()
      }
    }
    void loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCheckStatus = async () => {
    setChecking(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Account was deleted (rejected) — can't check status without a session.
      setSessionExpired(true)
      setChecking(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_status')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.account_status === 'active') {
      router.replace('/dashboard')
      return
    }

    const { data: activeVR } = await supabase
      .from('verification_requests')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!activeVR) {
      await fetchRejectionStatus()
    }

    setChecking(false)
  }

  // Keep a stable ref so the Realtime/polling effects always call the latest version.
  useEffect(() => {
    handleCheckStatusRef.current = handleCheckStatus
  })

  // Realtime subscription: automatically redirect when admin approves the user.
  // A pending user has no profile row — approval creates one, so we listen for INSERT.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let mounted = true

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return

      channel = supabase
        .channel(`approval-watch-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const newProfile = payload.new as { account_status?: string }
            if (newProfile.account_status === 'active') {
              router.replace('/dashboard')
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeOk(false)
          } else if (status === 'SUBSCRIBED') {
            setRealtimeOk(true)
          }
        })
    }

    void setup()

    return () => {
      mounted = false
      if (channel) void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fallback: poll every 30 seconds if the Realtime connection failed.
  useEffect(() => {
    if (realtimeOk) return
    const id = setInterval(() => void handleCheckStatusRef.current(), 30_000)
    return () => clearInterval(id)
  }, [realtimeOk])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[hsl(var(--background-login))]">
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-1">
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
            {rejectionReason ? 'Application Not Approved' : 'Verification Pending'}
          </CardTitle>
          <CardDescription>
            {rejectionReason
              ? 'Your application was reviewed and was not approved.'
              : 'Thanks for submitting your questionnaire!'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {rejectionReason ? (
            <>
              <div className="rounded-md bg-red-500/10 border border-red-500/30 p-4 text-sm space-y-2">
                <p className="font-semibold text-red-700 dark:text-red-400">
                  Your application was not approved
                </p>
                {rejectionReason.includes(' | ') ? (
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-left">
                    {rejectionReason.split(' | ').map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-left">
                    <span className="font-medium text-foreground">Reason:</span> {rejectionReason}
                  </p>
                )}
              </div>
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">What you can do</p>
                <ul className="list-disc pl-4 space-y-1 text-left">
                  <li>Sign out and sign back in to submit a new application.</li>
                  <li>Address the reason above in your new questionnaire.</li>
                  <li>Note: you have one remaining attempt.</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Our team is reviewing your application for{' '}
                <span className="font-medium text-foreground">{email}</span>.
                You&apos;ll receive an email once your account has been approved.
              </p>
              <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 text-left">
                  <li>An admin will review your questionnaire.</li>
                  <li>You&apos;ll be notified by email when approved.</li>
                  <li>Once approved you can access the full platform.</li>
                </ul>
              </div>
              {sessionExpired ? (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-4 text-sm space-y-2">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    Your application has been reviewed.
                  </p>
                  <p className="text-muted-foreground">
                    Sign in again to see the outcome and, if eligible, reapply.
                  </p>
                  <Button
                    onClick={handleSignOut}
                    className="w-full mt-2"
                    variant="default"
                  >
                    Sign In
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleCheckStatus}
                  disabled={checking}
                  className="w-full"
                  variant="default"
                >
                  {checking ? 'Checking…' : 'Check Approval Status'}
                </Button>
              )}
            </>
          )}

          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
      <footer className="py-4 text-center">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy-policy" className="underline hover:opacity-80">Privacy Policy</Link>
          <span aria-hidden="true">&middot;</span>
          <Link href="/terms" className="underline hover:opacity-80">Terms and Conditions</Link>
        </div>
      </footer>
    </div>
  )
}
