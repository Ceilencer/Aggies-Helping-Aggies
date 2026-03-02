'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function PendingApprovalPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      setEmail(user.email ?? '')

      // If admin approved the account while user is on this page, auto-forward.
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status')
        .eq('id', user.id)
        .single()

      if (profile?.account_status === 'active') {
        router.replace('/dashboard')
      }
    }
    void loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCheckStatus = async () => {
    setChecking(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_status')
      .eq('id', user.id)
      .single()

    if (profile?.account_status === 'active') {
      router.replace('/dashboard')
    } else {
      setChecking(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background-login))] p-4">
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
            Verification Pending
          </CardTitle>
          <CardDescription>
            Thanks for submitting your questionnaire!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
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

          <Button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full"
            variant="default"
          >
            {checking ? 'Checking…' : 'Check Approval Status'}
          </Button>

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
  )
}
